#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { HelloStack } from '../lib/hello-stack';

const app = new cdk.App();

new HelloStack(app, 'HelloStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
  },
});
