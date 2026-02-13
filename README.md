# Unnamed Project — Project Overview

## Qué es

Una plataforma de analytics diseñada para empresas sin equipos de data dedicados. El producto actúa como una capa de orquestación inteligente sobre BigQuery, permitiendo que perfiles de negocio (marketing, finanzas, operaciones) obtengan insights de sus datos sin escribir una sola línea de SQL.

Cada cliente opera en un **workspace** completamente aislado, con su propio proyecto de BigQuery por detrás — aunque nunca interactúa directamente con él. La experiencia del usuario es una interfaz limpia y accesible, potenciada por un agente de IA que funciona como un data analyst virtual.

## Cómo funciona

1. **El cliente conecta sus fuentes de datos** (Shopify, Stripe, Google Ads, HubSpot, etc.) desde la aplicación. Por detrás, Fivetran orquesta los pipelines y sincroniza los datos en el proyecto de BigQuery del workspace.

2. **La plataforma organiza y da sentido a los datos** a través de una capa semántica que traduce tablas y columnas a conceptos de negocio: "ventas del mes", "clientes activos", "coste de adquisición".

3. **El usuario interactúa con sus datos** mediante dashboards, reportes y, sobre todo, un agente conversacional de IA que responde preguntas en lenguaje natural, genera visualizaciones y propone insights proactivamente.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | React |
| Backend / API | NestJS |
| Base de datos de la aplicación | PostgreSQL (Cloud SQL) |
| Motor de analytics | BigQuery (un proyecto GCP por workspace) |
| Ingesta de datos | Fivetran |
| Autenticación | Clerk |
| Agente IA | Mastra AI |
| Infraestructura | Google Cloud Platform (Cloud Run, Cloud SQL) |

## Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────┐
│                   Cliente (React)                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Backend (NestJS · Cloud Run)            │
│  ┌───────────┐  ┌────────────┐  ┌────────────────┐  │
│  │   Auth    │  │ Orquestador│  │  Agente IA     │  │
│  │  (Clerk)  │  │  de Queries│  │  (Mastra AI)   │  │
│  └───────────┘  └────────────┘  └────────────────┘  │
└──────┬──────────────┬───────────────┬───────────────┘
       │              │               │
       ▼              ▼               ▼
┌────────────┐ ┌─────────────┐ ┌──────────────────┐
│  Postgres  │ │  BigQuery   │ │    Fivetran      │
│ (Cloud SQL)│ │ (1 proyecto │ │  (pipelines de   │
│  metadata, │ │ por workspace│ │   ingesta)       │
│  config    │ │  de cliente) │ │                  │
└────────────┘ └─────────────┘ └──────────────────┘
```

## Modelo de tenancy

Cada workspace es una unidad lógica completamente independiente. A nivel de infraestructura, esto se traduce en un **proyecto de GCP dedicado por workspace** que contiene sus datasets de BigQuery. La metadata del workspace (configuración, usuarios, permisos, capa semántica) vive en la base de datos Postgres compartida.

## Público objetivo

Empresas pequeñas y medianas que generan datos valiosos en sus herramientas del día a día pero no tienen la capacidad técnica ni el presupuesto para contratar un equipo de data. El producto les da superpoderes analíticos sin fricción técnica.