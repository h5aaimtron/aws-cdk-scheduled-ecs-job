import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class AwsCdkScheduledEcsJobStack extends cdk.Stack {
  public readonly ecr: ecr.Repository;
  public readonly appImage: ecs.ContainerImage;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * We're assuming here that you want to create a full infrastructure.
     * Normally items like vpc(s), ecs cluster(s), etc. would exist in 
     * an 'environments' repository as they're shared resources for your 
     * aws account. Each of these can be replaced with look up methods 
     * that can be found on their class types, often with names like 
     * lookupFromName or lookupFromArn, etc.
     * 
     * I've exposed ecr and appImage as readonly so that the pipeline
     * can access them for its needs. In this case, the pipeline only
     * really needs the ecr since it is always replacing the app image. 
     * If you're connecting to resources on private subnets, place the 
     * job in the private subnets, using PRIVATE_WITH_EGRESS. 
     */

    // Create VPC.
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2
    });

    // Create ECR Repository for application images.
    this.ecr = new ecr.Repository(this, 'EcrRepository', {
      removalPolicy: cdk.RemovalPolicy.DESTROY // Do not want to keep ECR upon stack destroy.
    });

    // Set application image config for ECR.
    this.appImage = ecs.ContainerImage.fromEcrRepository(this.ecr, 'latest');

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc
    });

    // Configure Log Group
    const logGroup = new logs.LogGroup(this, 'ScheduledTaskLogGroup');

    // Create Task Definition and Container.
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef');
    taskDef.addContainer('ScheduledContainer', {
      image: ecs.ContainerImage.fromRegistry('amazonlinux'), // Replace this with a created ECR and image.
      memoryLimitMiB: 512,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'ScheduledJob',
        logGroup
      }),
      command: ['echo', 'Hello from ECS scheduled task!']
    });

    // Provide execution permissions to task.
    taskDef.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));

    // Create a schedule rule.
    const rule = new events.Rule(this, 'ScheduleRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '4' }) // Run daily at 4:00 AM UTC
    });

    // Link to Event Bridge for triggering.
    rule.addTarget(new targets.EcsTask({
      cluster,
      taskDefinition: taskDef,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC }, // or PRIVATE_WITH_EGRESS
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    }));
  }
}
