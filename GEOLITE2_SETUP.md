# GeoLite2 Database Setup Instructions

## Download GeoLite2-Country Database

1. **Sign up for MaxMind GeoLite2** (free):
   - Go to: https://www.maxmind.com/en/geolite2/signup
   - Create a free account

2. **Download the database**:
   - Log in to your MaxMind account
   - Go to: https://www.maxmind.com/en/accounts/current/geoip/downloads
   - Download **GeoLite2 Country** in **GeoIP2 Binary (.mmdb)** format
   - The file will be named `GeoLite2-Country.mmdb`

3. **Place the database file**:
   ```
   png-finder/
   └── data/
       └── GeoLite2-Country.mmdb
   ```

4. **Create the data directory** if it doesn't exist:
   ```bash
   mkdir data
   ```

5. **Move the downloaded file**:
   - Extract the `.tar.gz` or `.zip` file you downloaded
   - Move `GeoLite2-Country.mmdb` to the `data/` folder

## Alternative: Automated Download (Requires License Key)

If you have a MaxMind license key, you can automate downloads. For now, manual download is simplest.

## Verification

The application will automatically detect if the database exists. If not:
- Downloads will still be tracked
- Country will be set to "UNKNOWN"
- GeoLite2 can be added later without data loss

## Updates

MaxMind updates GeoLite2 databases weekly. For production:
- Consider automating database updates
- Or use Cloudflare headers (future enhancement)
