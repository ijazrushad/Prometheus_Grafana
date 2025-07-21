# Full-Stack Monitoring with Prometheus & Grafana

This repository contains the complete configuration for a robust monitoring stack using Docker, Prometheus, and Grafana. It is designed to provide comprehensive health and performance monitoring for servers and websites.

The entire stack runs in Docker containers orchestrated by Docker Compose, making it portable and easy to manage.

## What's Being Monitored

This configuration is pre-built to monitor:
* **Host System Metrics (DigitalOcean VM):** Full health monitoring of the main server running the stack (CPU, Memory, Disk I/O, Network).
* **Remote System Metrics (AWS VM):** Full health monitoring of a remote AWS EC2 instance.
* **Website & URL Health:** Uptime, response time, and SSL certificate health for three specific web endpoints:
    * `https://wordstar.shabox.mobi/home/campaignimage`
    * `https://quizmaster.shabox.mobi/home/campaignimage5`
    * `https://gamestar.shabox.mobi/Home/CampaignImage4`

## Folder Structure

```
.
├── docker-compose.yml      # Main file to launch all services.
├── prometheus_config/
│   └── prometheus.yml      # Prometheus config: targets & scrape jobs.
├── nginx_config/
│   └── default.conf        # NGINX config: reverse proxy for Grafana.
├── blackbox_config/
│   └── config.yml          # Blackbox Exporter config: how to probe URLs.
└── README.md               # This documentation file.
```

## Prerequisites

Before you begin, you will need:
1.  **A primary server** (e.g., a DigitalOcean VM) where the monitoring stack will run.
2.  **Docker and Docker Compose** installed on this primary server.
3.  **A domain name** (e.g., `adplay-mobile.com`).
4.  **A Cloudflare account** managing your domain's DNS.
5.  **A remote AWS server** (EC2 instance) with Docker installed.

## Installation & Setup Guide

### Step 1: Set Up the AWS Server
Log in to your AWS EC2 instance and run the Node Exporter container. This will expose the server's health metrics on port 9100.

```bash
sudo docker run -d \
  --name=node-exporter \
  --net="host" \
  --pid="host" \
  -v "/:/host:ro,rslave" \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host
```
Next, go to your **AWS EC2 Console -> Security Groups**. Find the security group attached to your instance and add an **Inbound Rule** to allow `Custom TCP` traffic on port `9100` from the IP address of your DigitalOcean server.

### Step 2: Configure the Monitoring Server (DigitalOcean)

1.  Clone this repository to your DigitalOcean server.
2.  **Configure DNS**: In your Cloudflare account, create an **A record** for a subdomain (e.g., `monitoring`) that points to your DigitalOcean server's public IP. Ensure the proxy status is **Enabled** (orange cloud).
3.  **Configure NGINX**: Edit `nginx_config/default.conf` and replace `monitoring.adplay-mobile.com` with your chosen subdomain.
4.  **Configure Prometheus**: Edit `prometheus_config/prometheus.yml` and replace `<Your_AWS_Server_Public_IP>` with the public IP of your AWS EC2 instance.

### Step 3: Launch the Stacks

1.  **Launch the main monitoring stack**:
    ```bash
    cd /path/to/your/cloned/repo
    sudo docker-compose up -d
    ```
2.  **Launch the local Node Exporter**: This command runs the Node Exporter for the DigitalOcean VM itself and connects it to the Docker network.
    ```bash
    sudo docker run -d \
      --name=node-exporter \
      --network=monitoring-stack_monitoring_net \
      -v "/proc:/host/proc:ro" \
      -v "/sys:/host/sys:ro" \
      -v "/:/rootfs:ro" \
      quay.io/prometheus/node-exporter:latest \
      --path.procfs=/host/proc \
      --path.sysfs=/host/sys \
      --path.rootfs=/rootfs
    ```
    *(Note: The network name may vary slightly. Use `docker network ls` to confirm the name created by Docker Compose if needed.)*

### Step 4: Configure Grafana

1.  Navigate to your domain (e.g., `https://monitoring.adplay-mobile.com`).
2.  Log in to Grafana with the default credentials (`admin`/`your_secure_password`).
3.  **Add Prometheus as a Data Source**:
    * Go to Configuration -> Data Sources -> Add data source.
    * Select Prometheus.
    * Set the **Prometheus server URL** to `http://prometheus:9090`.
    * Click "Save & Test".
4.  **Import Dashboards**:
    * Go to Dashboards -> New -> Import.
    * Import dashboard ID **`1860`** for a full server overview (Node Exporter).
    * Import dashboard ID **`7587`** for website health monitoring (Blackbox Exporter).

## Accessing Services

* **Grafana Dashboard**: `https://monitoring.adplay-mobile.com`
* **Prometheus UI**: `http://<Your_DO_Server_IP>:9090` (Requires opening port 9090 in your firewall).

---
This setup provides a powerful and scalable foundation for all your future monitoring needs.