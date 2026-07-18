#!/bin/sh
# Configure root SSH login with the injected password, start sshd, then expose
# port 22 through a bore tunnel. bore prints "listening at <server>:<port>" to
# stdout — the contributor reads that from `docker logs` to learn the endpoint.
set -e

: "${SSH_PASSWORD:=fallow}"
: "${BORE_SERVER:=bore.pub}"

# Root login with the renter's address as the password.
echo "root:${SSH_PASSWORD}" | chpasswd
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

mkdir -p /run/sshd
ssh-keygen -A >/dev/null 2>&1

# sshd kept attached (-D) and logging to stderr (-e) so any errors (e.g. a
# privsep chroot failure) show up in `docker logs`. Backgrounded so bore can be
# the foreground process.
/usr/sbin/sshd -D -e &

# Local mode (NO_BORE): the contributor publishes port 22 to the host directly,
# so skip bore and just keep the container alive.
if [ -n "${NO_BORE}" ]; then
  exec tail -f /dev/null
fi

# bore in the foreground (PID 1) so the container's lifetime tracks the tunnel.
exec bore local 22 --to "${BORE_SERVER}"
