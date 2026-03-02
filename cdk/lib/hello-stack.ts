import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export class HelloStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const retention = logs.RetentionDays.ONE_WEEK;

    // ----- Node.js Lambda -----
    const helloLogGroup = new logs.LogGroup(this, 'HelloLogGroup', {
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const helloFunction = new lambdaNodejs.NodejsFunction(this, 'HelloFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../../lambda/src/hello.js'),
      handler: 'handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      logGroup: helloLogGroup,
    });

    // ----- PHP Lambda (Bref ランタイム) -----
    // 最新のレイヤー ARN は https://runtimes.bref.sh/ で確認してください
    const brefPhpLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'BrefPhpLayer',
      `arn:aws:lambda:${this.region}:873528684822:layer:php-84:15`,
    );

    const phpLogGroup = new logs.LogGroup(this, 'HelloPhpLogGroup', {
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const helloPhpFunction = new lambda.Function(this, 'HelloPhpFunction', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/src/hello_php'), {
        // cdk deploy 時に Docker で composer install を自動実行する
        bundling: {
          image: cdk.DockerImage.fromRegistry('composer:2'),
          entrypoint: ['/bin/sh'],
          command: [
            '-c',
            [
              'cp -rp /asset-input/. /tmp/app',
              'cd /tmp/app',
              'composer install --no-dev --optimize-autoloader --prefer-dist',
              'cp -rp . /asset-output/',
            ].join(' && '),
          ],
        },
      }),
      handler: 'index.php',  // Bref v3 は拡張子 .php が必須
      layers: [brefPhpLayer],
      environment: {
        BREF_RUNTIME: 'function',  // Bref v3 で関数ハンドラを使う場合に必須
      },
      logGroup: phpLogGroup,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    });

    // ----- HTTP API (API Gateway v2) -----
    const apiLogGroup = new logs.LogGroup(this, 'HelloApiLogGroup', {
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const api = new apigatewayv2.HttpApi(this, 'HelloApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.GET],
      },
    });

    // API Gateway アクセスログを有効化
    const stage = api.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    stage.accessLogSettings = {
      destinationArn: apiLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId:          '$context.requestId',
        ip:                 '$context.identity.sourceIp',
        requestTime:        '$context.requestTime',
        httpMethod:         '$context.httpMethod',
        path:               '$context.path',
        status:             '$context.status',
        responseLength:     '$context.responseLength',
        integrationStatus:  '$context.integrationStatus',
        integrationLatency: '$context.integrationLatency',
        integrationError:   '$context.integrationErrorMessage',
      }),
    };

    // GET /hello → Node.js Lambda
    api.addRoutes({
      path: '/hello',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'HelloIntegration',
        helloFunction,
      ),
    });

    // GET /hello_php → PHP Lambda
    api.addRoutes({
      path: '/hello_php',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration(
        'HelloPhpIntegration',
        helloPhpFunction,
      ),
    });

    // デプロイ後に URL・ロググループ名を出力
    new cdk.CfnOutput(this, 'HelloUrl', {
      value: `${api.url}hello`,
      description: 'GET /hello endpoint URL',
    });

    new cdk.CfnOutput(this, 'HelloPhpUrl', {
      value: `${api.url}hello_php`,
      description: 'GET /hello_php endpoint URL',
    });

    new cdk.CfnOutput(this, 'HelloLogGroupName', {
      value: helloLogGroup.logGroupName,
      description: 'Node.js Lambda Log Group',
    });

    new cdk.CfnOutput(this, 'PhpLogGroupName', {
      value: phpLogGroup.logGroupName,
      description: 'PHP Lambda Log Group',
    });

    new cdk.CfnOutput(this, 'ApiLogGroupName', {
      value: apiLogGroup.logGroupName,
      description: 'API Gateway Access Log Group',
    });
  }
}
