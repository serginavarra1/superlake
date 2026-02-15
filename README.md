# Unnamed Project — Project Overview

## Qué es

Una plataforma de analytics diseñada para empresas sin equipos de data dedicados. El producto actúa como una capa de orquestación inteligente sobre BigQuery, permitiendo que perfiles de negocio (marketing, finanzas, operaciones) obtengan insights de sus datos sin escribir una sola línea de SQL.

Cada cliente opera en una **orgainzation** completamente aislado, con su propio proyecto de BigQuery por detrás — aunque nunca interactúa directamente con él. La experiencia del usuario es una interfaz limpia y accesible, potenciada por un agente de IA que funciona como un data analyst virtual.

## Cómo funciona

1. **El cliente conecta sus fuentes de datos** (Shopify, Stripe, Google Ads, HubSpot, etc.) desde la aplicación. Por detrás, Fivetran orquesta los pipelines y sincroniza los datos en el proyecto de BigQuery de la orgainzation.

2. **La plataforma organiza y da sentido a los datos** a través de una capa semántica que traduce tablas y columnas a conceptos de negocio: "ventas del mes", "clientes activos", "coste de adquisición".

3. **El usuario interactúa con sus datos** mediante dashboards, reportes y, sobre todo, un agente conversacional de IA que responde preguntas en lenguaje natural, genera visualizaciones y propone insights proactivamente.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | React |
| Backend / API | NestJS |
| Base de datos de la aplicación | PostgreSQL (Cloud SQL) |
| Motor de analytics | BigQuery (un proyecto GCP por organization) |
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
│  metadata, │ │ por organization│ │   ingesta)       │
│  config    │ │  de cliente) │ │                  │
└────────────┘ └─────────────┘ └──────────────────┘
```

## Modelo de tenancy

Cada Orgainzation es una unidad lógica completamente independiente. A nivel de infraestructura, esto se traduce en un **proyecto de GCP dedicado por organization** que contiene sus datasets de BigQuery.

## Configuración de IAM en Google Cloud

El backend crea proyectos de GCP automáticamente cuando se crea una organización en Clerk. La identidad que ejecuta la API (usuario en local, SA del runtime en producción) crea los proyectos directamente vía ADC (Application Default Credentials).

### Flujo de autenticación

```
Identidad (ADC)  ──→  Cloud Resource Manager API  ──→  Nuevo proyecto en GCP Folder
```

1. **En desarrollo local**: tu usuario autenticado con `gcloud auth application-default login`
2. **En producción**: el SA del runtime (Cloud Run, GKE, etc.) vía Workload Identity

### Requisitos previos

1. **Una GCP Organization** con al menos una **Folder** donde se crearán los proyectos de los tenants
2. **Un proyecto de gestión** (management project) donde están habilitadas las APIs
3. **APIs habilitadas** en el proyecto de gestión:
   - Cloud Resource Manager API (`cloudresourcemanager.googleapis.com`)

### Roles necesarios

| Quién | Rol | Dónde | Por qué |
| --- | --- | --- | --- |
| Identidad que ejecuta la API (tu usuario o SA del runtime) | `roles/resourcemanager.projectCreator` | Folder destino | Para crear proyectos dentro de la folder |

#### Asignar Project Creator (a nivel de folder)

```bash
# Para desarrollo local (tu usuario)
gcloud resource-manager folders add-iam-policy-binding <FOLDER_ID> \
  --member="user:<TU_EMAIL>" \
  --role="roles/resourcemanager.projectCreator"

# Para producción (SA del runtime, e.g. Cloud Run)
gcloud resource-manager folders add-iam-policy-binding <FOLDER_ID> \
  --member="serviceAccount:<RUNTIME_SA_EMAIL>" \
  --role="roles/resourcemanager.projectCreator"
```

### Variables de entorno

```env
GCP_PARENT_FOLDER_ID=<FOLDER_ID>
```

### Desarrollo local

```bash
# Autenticarte con ADC (solo una vez)
gcloud auth application-default login
```

## Público objetivo

Empresas pequeñas y medianas que generan datos valiosos en sus herramientas del día a día pero no tienen la capacidad técnica ni el presupuesto para contratar un equipo de data. El producto les da superpoderes analíticos sin fricción técnica.
