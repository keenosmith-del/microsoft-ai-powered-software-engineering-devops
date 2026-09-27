# AI-Powered Software Engineering & DevOps Operations Platform

## Overview

Software engineering teams work across a growing number of systems every day: source repositories, CI/CD pipelines, testing environments, cloud infrastructure, monitoring platforms and deployment tooling.

When something goes wrong, engineers often have to investigate the problem by manually connecting information from all of these systems.

This project explores a different approach: using **agentic AI to assist with software engineering and DevOps operations**.

The platform is designed to help investigate engineering problems, understand what happened, identify likely root causes, propose remediation, validate changes and support controlled software delivery.

It is built around Microsoft Foundry and a multi-agent architecture, with specialised agents responsible for different parts of an engineering investigation.

## The Problem

A typical production failure might look simple at first:

> A deployment failed.

But determining why it failed can require looking at:

* the latest Git commit;
* source-code changes;
* application configuration;
* CI/CD logs;
* test results;
* container logs;
* deployment state;
* application errors;
* infrastructure configuration; and
* monitoring and telemetry.

These pieces of information often exist in different systems.

The goal of this project is to explore whether AI agents can help bring this information together and make the investigation process more efficient.

## What the Platform Does

The platform is designed around an engineering investigation workflow:

```text
Engineering Event
       ↓
     Triage
       ↓
  Investigation
       ↓
 Evidence Gathering
       ↓
 Root-Cause Analysis
       ↓
 Remediation Proposal
       ↓
 Validation
       ↓
 Human Approval
       ↓
 CI/CD
       ↓
 Deployment
       ↓
 Post-Deployment Checks
```

The system is not intended to blindly allow an AI model to modify production systems.

Instead, it uses **bounded autonomy**.

The AI can investigate, analyse evidence, propose changes and perform controlled engineering tasks, while higher-risk actions remain subject to validation and human approval.

## Multi-Agent Approach

Rather than relying on a single general-purpose AI agent, the platform separates responsibilities between specialised agents.

For example:

### Code Agent

Investigates repositories, source code, dependencies, configuration and recent changes.

### Test Agent

Investigates failing tests, stack traces, regressions and test-environment problems.

### DevOps Agent

Investigates builds, CI/CD pipelines, containers and deployments.

### SRE Agent

Looks at operational information such as logs, metrics, traces and application health to help identify the relationship between an engineering change and a production problem.

### Engineering Agent

Uses the findings from the investigation to develop a potential remediation and guide the change through validation.

A coordinating layer manages the overall investigation and combines the results from the different agents.

## Evidence Before Action

One of the main ideas behind the project is that an AI-generated explanation should not automatically be treated as the answer.

The system is designed to gather evidence from engineering systems before making a recommendation.

For example:

```text
Deployment Failure
       ↓
Recent Commit
       ↓
Configuration Change
       ↓
Application Startup Error
       ↓
Container Logs
       ↓
Health Check Failure
       ↓
Root-Cause Investigation
```

The objective is to move from:

**"The deployment failed."**

to:

**"The deployment failed because a configuration change introduced a missing environment variable, supported by the deployment logs, application logs and recent configuration changes."**

That distinction is important when applying AI to real engineering workflows.

## AI-Assisted Software Delivery

Once a potential solution has been identified, the platform can treat the proposed change as an engineering change rather than simply generating an answer.

The intended workflow is:

```text
Root Cause
    ↓
Proposed Change
    ↓
Working Branch
    ↓
Validation
    ↓
Tests
    ↓
Security Checks
    ↓
Pull Request
    ↓
CI/CD
    ↓
Deployment
    ↓
Health Verification
```

This allows conventional engineering controls to remain part of the process.

AI proposes.

Engineering tooling validates.

Policies determine what can happen next.

Humans approve high-impact actions.

## RAG and Engineering Knowledge

The platform can also use project-specific engineering knowledge to provide better context to agents.

Potential sources include:

* Architecture documentation
* Runbooks
* Coding standards
* Incident reports
* Architecture Decision Records
* Deployment procedures
* Troubleshooting guides
* Security standards
* Service documentation

This gives agents access to information about the particular engineering environment rather than relying exclusively on general knowledge from the underlying model.

## Tools and Integrations

The agents are designed to interact with external engineering systems through controlled tools.

These can include:

* GitHub
* Azure DevOps
* CI/CD systems
* REST APIs
* OpenAPI tools
* MCP tools
* Azure services
* Testing environments
* Monitoring and observability systems

The important distinction is that the AI model does not need unrestricted access to these systems.

Its capabilities can be explicitly defined and limited.

## Security and Controlled Autonomy

Security is a core part of the architecture.

Different agents can have different permissions depending on their responsibilities.

For example, an investigation agent may be able to read repository information while a change-oriented agent may be allowed to create a branch or pull request.

Production deployment and other high-impact operations can require additional approval.

The underlying Azure architecture uses services such as:

* Microsoft Entra ID
* Azure RBAC
* Managed Identities
* Azure Key Vault

The goal is to ensure that AI agents operate within clearly defined boundaries.

## Observability

AI systems introduce another layer of behaviour that needs to be understood.

The platform therefore considers observability across both the traditional application and the AI workflow.

This can include:

* Agent execution
* Model calls
* Tool calls
* Tool results
* Application logs
* Metrics
* Distributed traces
* Deployment events
* Post-deployment health

This makes it possible to investigate not only what happened to the application, but also what the AI system did during its investigation.

## Technology

The platform is built around the Microsoft cloud ecosystem and includes technologies such as:

* Microsoft Foundry
* Foundry Agent Service
* Microsoft Agent Framework
* Azure
* Python
* GitHub
* REST APIs
* OpenAPI
* MCP
* Docker
* Azure Container Apps
* Azure Functions
* Azure Service Bus
* Azure AI Search
* Azure Monitor
* Application Insights
* OpenTelemetry
* Microsoft Entra ID

## What I Am Exploring

This project is ultimately an exploration of a broader question:

> **What does software engineering look like when AI agents become active participants in the engineering lifecycle?**

The interesting challenge is not simply giving an LLM access to a codebase.

It is designing the surrounding system so that an AI agent can:

1. Understand an engineering problem.
2. Gather relevant evidence.
3. Investigate across multiple systems.
4. Distinguish symptoms from likely causes.
5. Propose a solution.
6. Validate that solution using deterministic engineering tools.
7. Operate within defined security boundaries.
8. Escalate decisions when human judgement is required.
9. Verify the outcome after deployment.

That makes the project less about building another coding assistant and more about exploring **AI as an engineering operations layer**.

## Project Status

This is an actively developed engineering project.

The architecture and implementation are being developed incrementally, with particular attention to:

* Multi-agent orchestration
* AI tool integration
* Retrieval and engineering context
* Agent evaluation
* Observability
* Security boundaries
* Containerisation
* Cloud deployment
* Human-in-the-loop controls

The detailed technical architecture and implementation notes are available in the main [`README.md`](../README.md).
