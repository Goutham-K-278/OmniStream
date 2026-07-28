# OmniStream 🚀

A real-time telemetry and log ingestion platform deployed on AWS EKS with full CI/CD automation.

## Architecture

```
[ You push code ] → [ GitHub Actions CI/CD ]
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             [Docker Hub]    [AWS EKS]
           (New image built) (Auto-deployed)
                    │
          [ AWS NLB (Load Balancer) ]
                    │
          [ Nginx Ingress Controller ]
                    │
           [ OmniStream App Pods ]
                    │
          [ Prometheus + Grafana ]
             (Monitoring & Alerts)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, tRPC |
| Backend | Node.js, Express, Drizzle ORM |
| Database | MySQL |
| Containerization | Docker |
| Orchestration | Kubernetes (AWS EKS) |
| Infrastructure | Terraform |
| Monitoring | Prometheus + Grafana (via Helm) |
| CI/CD | GitHub Actions |

## Project Phases

- **Phase 1** ✅ Docker — Containerized with multi-stage build
- **Phase 2** ✅ AWS Infra — VPC, EKS, Node Groups via Terraform
- **Phase 3** ✅ Kubernetes — Deployment, Service, Ingress YAML
- **Phase 4** ✅ Observability — Prometheus & Grafana via Helm
- **Phase 5** ✅ CI/CD — Automated Docker build & EKS deploy via GitHub Actions

## Repository Structure

```
.
├── backend/          # Node.js/tRPC API server
├── frontend/         # React dashboard UI
├── shared/           # Shared types between frontend & backend
├── drizzle/          # Database schema and migrations
├── terraform/        # AWS infrastructure (VPC, EKS)
├── kubernetes/       # K8s Deployment, Service, Ingress
├── .github/
│   └── workflows/
│       └── deploy.yaml  # CI/CD pipeline
└── Dockerfile
```

## Required GitHub Secrets

For the CI/CD pipeline to work, add these in GitHub → Settings → Secrets → Actions:

| Secret Name | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token |
| `AWS_ACCESS_KEY_ID` | AWS IAM User Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM User Secret Key |

## Demo Day Workflow

```bash
# 1. Spin up infrastructure
cd terraform && terraform apply

# 2. Connect kubectl to your cluster
aws eks update-kubeconfig --name omnistream-cluster --region us-east-1

# 3. Deploy OmniStream
kubectl apply -f kubernetes/

# 4. Deploy Prometheus + Grafana
helm install monitoring prometheus-community/kube-prometheus-stack -f kubernetes/prometheus-values.yaml

# 5. After demo - destroy everything to avoid charges!
terraform destroy
```
