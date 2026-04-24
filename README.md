# Superlake

Superlake is a **SaaS data analytics platform** driven by **AI agents** that enables organizations to explore their data and surface insights through a **conversational interface**. Users ask questions in **plain language** and receive answers in the form of complex **analyses**, **charts**, and **dashboards** generated automatically.


### How it works

1. **Connect** your data sources or upload your files
2. **Ask** questions in plain language via the AI agent
3. **Receive** analyses, charts, and dashboards automatically
4. **Share** insights across your team

## Demo video
Pending

## Architecture diagram

![Superlake architecture](assets/superlake_architecture_diagram.png)

## Tech Stack

| Technology | Description |
| --- | --- |
| **React 19** + **TypeScript** | Frontend web application |
| **NestJS** | Backend REST API |
| **Prisma** + **PostgreSQL** | ORM and relational database |
| **Mastra** | AI agent framework for agentic workflows |
| **Google Gemini** | LLM powering the AI agent |
| **Clerk** | Authentication and multi-tenant user management |
| **Google BigQuery** | Cloud data warehouse for analytical queries |
| **Fivetran** | Data integration platform for external data sources |
| **Google Cloud Platform** | Cloud infrastructure (Cloud Run, Cloud SQL, GCS, VPC) |
| **Terraform** | Infrastructure as Code for GCP provisioning |
| **Docker** + **GitHub Actions** | Containerization and CI/CD pipelines |
