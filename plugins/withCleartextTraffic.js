const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to ensure cleartext HTTP traffic is fully permitted in standalone APK builds.
 * This is required for local ESP32 / IoT communication over HTTP (e.g. http://192.168.4.1).
 *
 * Configures both:
 * 1. android:usesCleartextTraffic="true" on <application>
 * 2. android:networkSecurityConfig="@xml/network_security_config" with cleartext permitted
 */
const withCleartextTraffic = (config) => {
  // 1. Add android:usesCleartextTraffic="true" and android:networkSecurityConfig to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.application || manifest.application.length === 0) {
      return config;
    }

    const mainApplication = manifest.application[0];
    if (!mainApplication.$) {
      mainApplication.$ = {};
    }

    // Explicitly enable cleartext HTTP traffic for Android 9+ (API 28+)
    mainApplication.$['android:usesCleartextTraffic'] = 'true';
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    return config;
  });

  // 2. Generate res/xml/network_security_config.xml during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(resXmlDir, { recursive: true });

      const xmlPath = path.join(resXmlDir, 'network_security_config.xml');
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.4.1</domain>
        <domain includeSubdomains="true">192.168.4.2</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
`;
      fs.writeFileSync(xmlPath, xmlContent, 'utf-8');
      return config;
    },
  ]);

  return config;
};

module.exports = withCleartextTraffic;
