# Welcome to Building your Express Fargate Demo Stack 

## Step 1: Bootstrap your enironment

* `cdk bootstrap`

## Step 2: Create your OAuth Token

Visit github.com

Visit Settings > Developer Settings > Personal Access Tokens > Generate New Token

Include the following scopes:
- All of the repo
- Workflow

## Step 2: Save the token in as an AWS Secrets Manager
Use AWS Secrets Manager to create a new secret.
- Click on "Store new"
- Select "Other type of secret"
- In the key field type in the name of the key. For example: "<github-handle>-github-token"
- In the value field paste your Github Token
- Click "Next"
- Give your secret a name for example: "<github-handle>/token"
- And create the secret (use default configs for the rest)

## Step 3: Update your environment configs
Go to `cdk/bin/cdk.js` Update the config variables
You will need to: 
- update the `oauthToken` with the value you set the name of your **secret**.
- update the `jsonField` with the value you set to for the **key**.

## Step 3: Comment out the image and PORT
- Got to `cdk/lib/cdk-stack.js` 
- Comment out `image: ecs.ContainerImage.fromEcrRepository(ecrRepository),`
- Comment out ` containerPort: config.FRONTEND_PORT,`
- Uncomment `image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),`
- Uncomment ` containerPort: 80`

## Step 4: Deploy the code
Deploy the code with the command `cdk deploy`

Do not worry about the Deploy stage passing. Even if it fails, just make sure the build stage Succeed.

## Step 5: Comment out the image and PORT
- Got to `cdk/lib/cdk-stack.js` 
- Uncomment out `image: ecs.ContainerImage.fromEcrRepository(ecrRepository),`
- Uncomment out ` containerPort: config.FRONTEND_PORT,`
- Comment `image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),`
- Comment ` containerPort: 80`

## Step 6: Deploy the code
Deploy the code with the command `cdk deploy`

## Step 6: Rebuild Code
Visit the AWS Code Pipeline console (make sure you are in the right region) and look for `ExpressFargateDemo-Pipeline`. Click into it and click on `Release Change`

## Test
Visit the AWS Code Pipeline console (make sure you are in the right region) and look for `ExpressFargateDemo-Pipeline`. 
- Click into it. 
- Click `Details` below the `Deploy` action
- On the ECS page, click on hyperlink to the `Load balancer name`.
- Select the Load Balancer that appears in the list
- In the details section you will see DNS name appear. Copy it and place it in browser.
- You should see `Hello World`




