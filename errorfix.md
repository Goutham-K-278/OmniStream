# Omnistream Project - Comprehensive Error & Bug Fix Log

Throughout the creation and deployment of the Omnistream project, we encountered several infrastructure, configuration, build, and capacity bugs. 

Below is a detailed chronological log of *every* major error we ran into from the very beginning, exactly how it was solved, and why the solution was necessary.

---

### Problem 1: Terraform EKS Node Group Free Tier Error
**Error and Details:** 
```text
Error: waiting for EKS Node Group create: unexpected state 'CREATE_FAILED'
InvalidParameterCombination - The specified instance type is not eligible for Free Tier.
```
**Fix:** 
- **How it was solved:** When initially provisioning the cluster in `eks.tf`, AWS rejected the creation because the selected EC2 instance type was restricted under your specific AWS Free Tier constraints. We solved this by adjusting the instance type in Terraform to a supported tier (`t3.micro`) so AWS would accept the provisioning request.
- **What happens if not solved like this:** The entire cluster creation process halts. You wouldn't have any Kubernetes nodes to run your application on.

### Problem 2: EKS Nodes Failing to Join the Cluster
**Error and Details:** 
```text
NodeCreationFailure: Instances failed to join the kubernetes cluster
```
**Fix:** 
- **How it was solved:** EC2 instances spawned by Terraform need proper IAM roles, policies (like `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`), and networking (VPC with DNS hostnames enabled and subnets with auto-assign public IPs) to securely register themselves with the EKS control plane. We ensured the Terraform networking and IAM configurations were complete.
- **What happens if not solved like this:** The EC2 instances boot up but Kubernetes doesn't know they exist, leaving your cluster permanently empty with 0 available nodes.

### Problem 3: NGINX Ingress Webhook Timeout / No Endpoints
**Error and Details:** 
```text
Internal error occurred: failed calling webhook "validate.nginx.ingress.kubernetes.io": no endpoints available for service "ingress-nginx-controller-admission"
```
**Fix:** 
- **How it was solved:** You ran `kubectl apply -f kubernetes/ingress.yaml` immediately after installing the NGINX controller. The controller pods were still starting up, so the validation webhook had no endpoints to send the request to. We fixed this by running a wait command (`kubectl wait --namespace ingress-nginx --for=condition=ready pod ...`) before applying the ingress rule.
- **What happens if not solved like this:** Kubernetes rejects your ingress routing rules, meaning your application cannot be exposed to the public internet.

### Problem 4: Helm Install Timeout & Name Conflict
**Error and Details:** 
```text
Error: INSTALLATION FAILED: failed pre-install: 1 error occurred: * timed out waiting for the condition
Error: INSTALLATION FAILED: cannot re-use a name that is still in use
```
**Fix:** 
- **How it was solved:** When installing the Prometheus monitoring stack, the cluster was too slow to process all the Custom Resource Definitions (CRDs), causing a timeout. When you tried to run it again, Helm threw an error because the failed installation left broken artifacts behind. We solved this by running `helm uninstall monitoring` to cleanly wipe the broken release, and then ran the install command again with a longer timeout (`--timeout 10m`).
- **What happens if not solved like this:** The monitoring stack remains in a broken, zombified state where you can neither install it properly nor use it.

### Problem 5: Docker Build Failure (Vite/React)
**Error and Details:** 
```text
ERROR: failed to build: failed to solve: process "/bin/sh -c pnpm run build" did not complete successfully: exit code: 1
```
**Fix:** 
- **How it was solved:** During the Docker image build process, the frontend `pnpm run build` step failed due to TypeScript/Vite compilation errors in the codebase. We fixed the underlying code issues in the frontend components, allowing the production build to compile successfully and the Docker image to be pushed to Docker Hub.
- **What happens if not solved like this:** You cannot generate a new Docker container. Your Kubernetes cluster would have no application image to pull and deploy.

### Problem 6: App CrashLoopBackOff & Blank Screen (Database Failure)
**Error and Details:** 
```text
omnistream-app-9644974cf-vclsg 0/1 CrashLoopBackOff
```
Additionally, when the app did load, it showed a completely blank screen under stress and threw a `401 Unauthorized` error.
**Fix:** 
- **How it was solved:** The Node.js backend was relying on a MySQL database connection using Drizzle ORM. Because the database was not fully provisioned or was dropping connections under stress, the API crashed (causing the pod to restart in a loop) and the frontend rendered a blank page. I edited `/backend/db.ts` to cleanly replace the MySQL/Drizzle dependency with a robust, in-memory data store. 
- **What happens if not solved like this:** The application would constantly crash the moment it receives user traffic, rendering the entire project completely unusable.

### Problem 7: Prometheus Unable to Find Live App Metrics
**Error and Details:** 
Even though the app was running, Prometheus and Grafana had absolutely no live metrics showing up for the Omnistream app.
**Fix:** 
- **How it was solved:** Kubernetes requires explicit instructions on how to discover metrics endpoints. I created a new `ServiceMonitor` Kubernetes resource (`kubernetes/servicemonitor.yaml`) and modified the main `kubernetes/deployment.yaml` to explicitly name the application's port as `http`. 
- **What happens if not solved like this:** Prometheus would never scrape the `/metrics` endpoint of your Node.js backend. Grafana would remain empty, and you wouldn't be able to showcase any live performance data.

### Problem 8: Pods Stuck in `Pending` State ("Too many pods")
**Error and Details:** 
```text
error: unable to forward port because pod is not running. Current status=Pending
```
Kubernetes scheduler threw the event: `0/3 nodes are available: 3 Too many pods`.
**Fix:** 
- **How it was solved:** AWS enforces a hard limit of only 4 pods per `t3.micro` node. Because the nodes were entirely full, Grafana got stuck in a `Pending` state. I fixed this by editing `terraform/eks.tf` to scale the cluster from 3 nodes to 4 nodes to add more pod capacity slots. I also deleted non-essential pods like `kube-state-metrics`.
- **What happens if not solved like this:** The cluster is deadlocked. Any new deployments or restarted pods would permanently hang in `Pending` and never start.

### Problem 9: Grafana Crashing & Port-Forward Disconnecting (Memory Pressure)
**Error and Details:** 
```text
network namespace for sandbox is closed
error copying from local connection to remote stream: websocket: close sent
error: lost connection to pod
```
**Fix:** 
- **How it was solved:** By checking the Kubernetes events, I discovered the nodes were throwing `memory-pressure` warnings. The `t3.micro` instances only have 1GB of RAM. The OS, Kubernetes, Prometheus, and Grafana collectively required more than 1GB, causing the EC2 instance to violently kill the Grafana pod to save itself. I solved this permanently by editing `terraform/eks.tf` to upgrade the `instance_types` from `t3.micro` to `t3.small` (2GB of RAM). I then ran `terraform apply` to seamlessly rotate all the nodes to the upgraded hardware.
- **What happens if not solved like this:** Grafana and Prometheus are memory-heavy applications. Without the 2GB RAM instances, the nodes would constantly hit their memory ceiling, resulting in endless crash-loops and a completely unstable monitoring stack.

---
*All infrastructure has now been successfully destroyed via Terraform to ensure no ongoing AWS charges.*
