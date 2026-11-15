#!/bin/bash
# ========================================================
# Helper Script: Management SSH Tunnel ke AWS PostgreSQL
# Service utama dikelola otomatis oleh systemd: firms-tunnel.service
# ========================================================

SERVICE_NAME="firms-tunnel.service"

case "$1" in
    start)
        echo "🚀 Menjalankan tunnel via systemd..."
        systemctl --user start $SERVICE_NAME
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    stop)
        echo "🛑 Menghentikan tunnel..."
        systemctl --user stop $SERVICE_NAME
        echo "Tunnel dihentikan."
        ;;
    restart)
        echo "🔄 Memulai ulang tunnel..."
        systemctl --user restart $SERVICE_NAME
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    status)
        echo "📊 Status SSH Tunnel:"
        systemctl --user status $SERVICE_NAME --no-pager
        ;;
    test)
        echo "🔍 Menguji koneksi database via port 5433..."
        python3 -c "
import psycopg2
try:
    conn = psycopg2.connect(host='127.0.0.1', port=5433, user='firms_user', password='firms_password', dbname='firms_db', connect_timeout=5)
    cur = conn.cursor()
    cur.execute('SELECT count(*) FROM hotspots;')
    print(f'✅ Koneksi Sukses! Total Hotspots di AWS: {cur.fetchone()[0]:,}')
    conn.close()
except Exception as e:
    print('❌ Koneksi Gagal:', e)
"
        ;;
    *)
        echo "Penggunaan: $0 {start|stop|restart|status|test}"
        exit 1
        ;;
esac
