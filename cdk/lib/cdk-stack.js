const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');
const iam = require('aws-cdk-lib/aws-iam');
const ecs = require('aws-cdk-lib/aws-ecs');
const ecr = require('aws-cdk-lib/aws-ecr');
const logs = require('aws-cdk-lib/aws-logs')
const codepipeline = require('aws-cdk-lib/aws-codepipeline');
const codepipeline_actions = require('aws-cdk-lib/aws-codepipeline-actions');
const codebuild = require('aws-cdk-lib/aws-codebuild');
const ecsPatterns = require('aws-cdk-lib/aws-ecs-patterns');

class ExpressFargateDemo extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    const config = props.envVariables

    const vpc = new ec2.Vpc(this, `${this.stackName}-VPC`)

    // ECS CLUSTER
    const cluster = new ecs.Cluster(this, `${this.stackName}-Cluster`, {
      clusterName: `${this.stackName}-Cluster`,
      vpc
    })

    const ecrRepository = new ecr.Repository(
      this,
      `${this.stackName}-repository`,
      {
        repositoryName: `${(this.stackName).toLowerCase()}-repository`,
        removalPolicy: RemovalPolicy.DESTROY
      }
    )

    const containerName = 'application-frontend'

    const logGroup = new logs.LogGroup(this, `${this.stackName}-TaskLogGroup`, {
      logGroupName: '/express-fargate-demo/tasks',
      removalPolicy: RemovalPolicy.DESTROY
    })
    const serviceLogDriver = new ecs.AwsLogDriver({
      logGroup,
      streamPrefix: '/ecs'
    })

    const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, `${this.stackName}-Cluster-TaskDefintion`, {
      memoryLimitMiB: 1024,
      cpu: 512,
    })

    fargateTaskDefinition.addContainer(`${this.stackName}-Container`, {
      // image: ecs.ContainerImage.fromEcrRepository(ecrRepository),
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      containerName,
      portMappings: [{
        // containerPort: config.FRONTEND_PORT,
        containerPort: 80
      }],
      logging: serviceLogDriver,
    })

    const loadBalancedFargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, `${this.stackName}-LoadBalancedFargateService`, {
      cluster,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      cpu: 512,
      taskDefinition: fargateTaskDefinition,
    });


    /** PIPELINE SETUP */
    // SOURCE STAGE
    const sourceOutput = new codepipeline.Artifact()
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'Github_Source',
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
      ...config.GITHUB_REPO_CONFIG,
    })

    // // BUILD STAGE
    const buildProject = new codebuild.PipelineProject(
      this,
      `${this.stackName}-BuildImage`,
      {
        vpc,
        projectName: `${this.stackName}-BuildImage`,
        description: `${this.stackName}: Build app`,
        environmentVariables: {
          REPOSITORY_URI: { value: `${ecrRepository.repositoryUri}` },
          REGION: { value: config.AWS_REGION },
          CONTAINER_NAME: { value: containerName },
        },
        environment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
          privileged: true
        },
        buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            pre_build: {
              commands: [
                'echo "Logging in to Amazon ECR registry and piping the output to Docker log in..."',
                'echo $REGION $REPOSITORY_URI',
                'aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPOSITORY_URI',
                'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
                'IMAGE_TAG=${COMMIT_HASH:=latest}'
              ]
            },
            build: {
              commands: [
                'echo Build started on `date`',
                'echo "Building Docker image..."',
                'echo $REPOSITORY_URI',
                'cd src',
                'echo `pwd`',
                'echo `ls -la`',
                'docker build -f Dockerfile -t $REPOSITORY_URI:latest .',
                'docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG'
              ]
            },
            post_build: {
              commands: [
                'echo Build completed on `date`',
                'echo "Pushing Docker image..."',
                'echo $REPOSITORY_URI:latest',
                'echo $REPOSITORY_URI:$IMAGE_TAG',
                'docker push $REPOSITORY_URI:latest',
                'docker push $REPOSITORY_URI:$IMAGE_TAG',
                'echo "Creating imageDetail.json"',
                `printf '[{\"name\":\"%s\",\"imageUri\":\"%s\"}]' "$CONTAINER_NAME" "$REPOSITORY_URI:latest" > ../imageDetail.json`,
                'pwd; ls -al; cat ../imageDetail.json'
              ]
            }
          },
          artifacts: {
            files: ['imageDetail.json']
          }
        })
      }
    )
    // add policy to push and pull to ECR
    const policy = new iam.PolicyStatement({
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability',
        'ecr:InitiateLayerUpload',
        'ecr:CompleteLayerUpload',
        'ecr:GetAuthorizationToken',
        'ecr:PutImage',
        'ecr:UploadLayerPart'
      ],
      resources: ['*']
    })
    buildProject.addToRolePolicy(policy)

    const buildOutput = new codepipeline.Artifact('buildOutput')

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput]
    })

    // // DEPLOY STAGE
    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'DeployAction',
      service: loadBalancedFargateService.service,
      imageFile: new codepipeline.ArtifactPath(buildOutput, 'imageDetail.json'),
      deploymentTimeout: Duration.minutes(20)
    })

    // // CREATE PIPELINE
    new codepipeline.Pipeline(this, `${this.stackName}-Pipeline`, {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction]
        },
        {
          stageName: 'Build',
          actions: [buildAction]
        },
        {
          stageName: 'Deploy',
          actions: [deployAction]
        }
      ]
    })
  }
}

module.exports = { ExpressFargateDemo }
