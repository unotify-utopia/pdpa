# PDPA Request App - Production Server & Deployment Configuration

## Server SSH Credentials
- **Host / IP**: `119.59.124.169`
- **User**: `root`
- **SSH Command**: `ssh root@119.59.124.169`
- **Password**: `9EIy;45Gf2n-`
- **Deployment Path on Server**: `/root/pdpa`

## Auto-Deploy Workflow
1. Code changes are pushed via Git to the remote repository.
2. Production path on the server is `/root/pdpa`.
3. When inspecting or deploying to production, connect via SSH to `119.59.124.169` (`/root/pdpa`) to verify updates, run `npm run build`, or check server service logs.
