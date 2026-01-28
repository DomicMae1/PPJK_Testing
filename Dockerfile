# Gunakan image PHP dengan Apache built-in
FROM php:8.2-apache

# Install dependencies sistem dan ekstensi PHP
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    zip \
    unzip \
    git \
    curl \
    ghostscript \
    nano \
    mc \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_pgsql zip pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Konfigurasi PHP.ini custom
RUN echo "file_uploads = On\n\
memory_limit = 256M\n\
upload_max_filesize = 64M\n\
post_max_size = 64M\n\
max_execution_time = 600\n\
" > /usr/local/etc/php/conf.d/uploads.ini

# Aktifkan mod_rewrite
RUN a2enmod rewrite ssl proxy proxy_http proxy_wstunnel

# Ubah DocumentRoot Apache
ENV APACHE_DOCUMENT_ROOT /var/www/html/public

# Buat file konfigurasi VirtualHost baru secara langsung
RUN echo '<VirtualHost *:80>\n\
    ServerAdmin webmaster@localhost\n\
    DocumentRoot /var/www/html/public\n\
    \n\
    <Directory /var/www/html/public>\n\
        Options Indexes FollowSymLinks\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    \n\
    # --- KONFIGURASI PROXY REVERB ---\n\
    # Kita menggunakan "reverb" sebagai host karena itu nama service di docker-compose\n\
    <IfModule mod_proxy.c>\n\
        <IfModule mod_proxy_wstunnel.c>\n\
            RewriteEngine On\n\
            RewriteCond %{HTTP:Upgrade} =websocket [NC]\n\
            RewriteCond %{HTTP:Connection} upgrade$ [NC]\n\
            RewriteRule ^/app(.*)$ ws://reverb:8080/app$1 [P,L]\n\
            \n\
            ProxyPass /app ws://reverb:8080/app\n\
            ProxyPassReverse /app ws://reverb:8080/app\n\
        </IfModule>\n\
        \n\
        # Fallback HTTP\n\
        ProxyPass /app http://reverb:8080/app\n\
        ProxyPassReverse /app http://reverb:8080/app\n\
    </IfModule>\n\
    # --------------------------------\n\
    \n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Aktifkan mod_rewrite (sudah ada di kode anda, pastikan tetap ada)
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /var/www/html

# Copy semua file project
COPY . .

# Install dependency PHP
RUN composer install --optimize-autoloader --no-dev

# Install dependency JS & Build
RUN npm install && npm run build

# Buat Script Startup (Entrypoint)
# UPDATED: Changed /mnt/Customer_Registration to /mnt/Ppjk
RUN echo '#!/bin/bash\n\
\n\
# Pastikan folder permission storage internal benar\n\
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache\n\
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache\n\
\n\
# Tangani Folder External (/mnt/Ppjk) sesuai config/filesystem.php\n\
# Cek apakah folder ada sebelum chown untuk menghindari error jika mount gagal\n\
if [ -d "/mnt/Ppjk" ]; then\n\
    chown -R www-data:www-data /mnt/Ppjk\n\
    chmod -R 775 /mnt/Ppjk\n\
    echo "✅ Permissions set for /mnt/Ppjk"\n\
else\n\
    echo "⚠️ Warning: /mnt/Ppjk not found inside container"\n\
fi\n\
\n\
if [ -f /tmp/hosts_external ]; then\n\
    echo "Processing /etc/hosts insertion..."\n\
    grep -v "127.0.0.1" /tmp/hosts_external | grep -v "::1" > /tmp/clean_hosts\n\
    sed "/127.0.0.1.*localhost/r /tmp/clean_hosts" /etc/hosts > /tmp/hosts.new\n\
    cat /tmp/hosts.new > /etc/hosts\n\
    echo "✅ Success inserted external hosts"\n\
fi\n\
\n\
# Jalankan storage:link\n\
php artisan storage:link\n\
\n\
# Jalankan Apache\n\
exec apache2-foreground\n\
' > /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Gunakan Script Startup
CMD ["/usr/local/bin/docker-entrypoint.sh"]