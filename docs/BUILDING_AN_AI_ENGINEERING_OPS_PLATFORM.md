# Building an AI Engineering Operations Platform

I've spent a lot of time building applications around generative AI, but one question kept coming up:

**What happens when AI is given a role in the engineering process itself?**

Most AI developer tools are designed around a fairly direct interaction. A developer asks a question, generates some code, explains an error or asks for a change.

That's useful, but software engineering is much larger than writing code.

A real engineering problem might involve a Git commit, a failed pipeline, a container, a configuration change, an application error and a production alert — all belonging to different systems.

I wanted to explore what an AI system would look like if it could help investigate that entire chain.

That became the idea behind my **AI-Powered Software Engineering & DevOps Operations Platform**.

## From coding assistant to engineering system

The starting point was deliberately different from building another AI coding assistant.

Instead of asking:

> "Can an AI write this function?"

I wanted to explore:

> "Can AI help an engineer understand what happened, determine why it happened, and safely help resolve it?"

That changes the architecture considerably.

The AI needs access to evidence.

It needs tools.

It needs context.

It needs to understand the relationship between different engineering systems.

And, perhaps most importantly, it needs boundaries.

## A production failure is rarely just one problem

Consider a simple example: a deployment fails.

The deployment system might tell you that the container failed its health check.

That doesn't necessarily tell you why.

An engineer might then look at the container logs and discover an application startup error. They might check the latest commit and find a configuration change. They might compare the deployment environment and discover that a required environment variable is missing.

Suddenly the original problem:

**"Deployment failed."**

has become:

**"A configuration change introduced a missing environment variable, causing the application to fail during startup."**

That's the kind of investigation I wanted the system to assist with.

## Why multiple agents?

One of the design decisions was to use specialised agents rather than a single agent responsible for everything.

Different parts of an engineering investigation require different types of reasoning and different tools.

A code-focused agent can investigate source files and dependencies.

A test-focused agent can investigate failures and regressions.

A DevOps-focused agent can inspect pipelines, containers and deployments.

An SRE-oriented agent can correlate application behaviour with logs, metrics and traces.

An engineering agent can then use those findings when developing a potential remediation.

The important part isn't simply having several agents.

The important part is **giving each one a defined responsibility and controlled capabilities**.

## Evidence before remediation

One of the things I wanted to avoid was treating an LLM's first explanation as the root cause.

An AI model can produce a convincing explanation without having enough evidence to support it.

So the system is designed around an investigation process:

```text
Event
  ↓
Triage
  ↓
Evidence
  ↓
Investigation
  ↓
Correlation
  ↓
Root Cause
  ↓
Remediation
```

The agents can inspect repositories, commits, configuration, test results, deployment information and operational telemetry.

The goal is to make the resulting diagnosis explainable in terms of the evidence that produced it.

## AI shouldn't replace the engineering controls

Another important design principle is that generating a change and deploying that change are two different things.

An agent might identify a likely fix.

That doesn't mean the fix should immediately reach production.

Instead, a proposed change can move through conventional engineering controls:

```text
AI Proposal
    ↓
Working Branch
    ↓
Tests
    ↓
Static Analysis
    ↓
Security Checks
    ↓
Pull Request
    ↓
CI/CD
    ↓
Approval
    ↓
Deployment
```

This is where I think the distinction between an AI demo and an engineering system becomes important.

The AI can participate in the workflow without being given unrestricted authority over it.

## The role of tools

An agent is only as useful as the information and actions available to it.

For this project, I explored how agents can interact with existing engineering systems through tools and APIs.

That includes things such as:

* GitHub
* CI/CD systems
* source repositories
* testing environments
* Azure services
* monitoring systems
* OpenAPI-based integrations
* MCP-based tools

Rather than putting implementation details into prompts, the agent can interact with systems through explicit capabilities.

That creates a cleaner boundary between the reasoning layer and the systems being operated.

## RAG is more useful when the context is specific

Another part of the project is the idea of giving agents access to engineering knowledge specific to the environment they're working in.

A general-purpose model may know how software systems work.

It won't necessarily know:

* how a particular organisation deploys applications;
* which coding standards a team follows;
* what a particular service is responsible for;
* how an internal system is architected;
* what an incident runbook recommends; or
* why a particular design decision was made.

That's where retrieval becomes useful.

Architecture documentation, runbooks, incident reports, coding standards and other engineering knowledge can provide the context required for an agent to reason about a specific environment.

## Observability applies to the AI too

Traditional applications already require logs, metrics and traces.

AI systems add another layer.

When an agent investigates an incident, there are now additional questions:

* Which agent was invoked?
* What information did it retrieve?
* Which tools did it use?
* What did those tools return?
* What did the model decide?
* Why did it recommend a particular action?
* How long did the investigation take?
* Did it stay within its permitted capabilities?

That makes AI observability an important part of the system rather than an afterthought.

The platform therefore considers observability across both the application and agent workflow.

## The interesting part is the boundary

The most interesting part of building this system hasn't been getting an LLM to generate an answer.

Models are already very good at generating plausible answers.

The harder engineering problem is designing everything around the model.

How do you give an agent enough context without overwhelming it?

How do you expose useful tools without giving it unnecessary authority?

How do you determine whether its diagnosis is actually supported by evidence?

How do you validate an AI-generated change?

How do you evaluate whether an agent is improving rather than simply producing convincing output?

And what should happen when the AI isn't confident?

These are engineering problems as much as AI problems.

## What I'm exploring next

The project is still evolving, but the direction is becoming increasingly clear.

I'm interested in the intersection between:

**Software Engineering**

**DevOps**

**SRE**

**Cloud Infrastructure**

**Agentic AI**

**Observability**

**AI Evaluation**

and **AI Safety**.

The long-term idea isn't to create an autonomous system that simply does whatever it is asked.

It's to explore what a **controlled AI engineering layer** could look like — one that can investigate problems, work with existing engineering tools, make evidence-backed recommendations and participate in delivery workflows while retaining the safeguards that make production software reliable.

That's a much more interesting problem to me than simply asking an LLM to write code.

And it's the direction I'm continuing to explore with this project.
