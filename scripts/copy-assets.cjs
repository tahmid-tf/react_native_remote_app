const fs = require('fs');
const path = require('path');

const iconSrc = 'C:/Users/tahmi/.gemini/antigravity/brain/1a118d3f-73f2-48d6-835c-6f7331710805/super_car_remote_app_icon_1793791017742.jpg';
const splashSrc = 'C:/Users/tahmi/.gemini/antigravity/brain/1a118d3f-73f2-48d6-835c-6f7331710805/super_car_splash_screen_1793791026073.jpg';

const targetDir = path.join(__dirname, '..', 'assets', 'images');

fs.copyFileSync(iconSrc, path.join(targetDir, 'icon.png'));
fs.copyFileSync(iconSrc, path.join(targetDir, 'android-icon-foreground.png'));
fs.copyFileSync(splashSrc, path.join(targetDir, 'splash-icon.png'));
fs.copyFileSync(splashSrc, path.join(targetDir, 'splash.png'));
fs.copyFileSync(iconSrc, path.join(targetDir, 'favicon.png'));

console.log('App icon and splash screen assets successfully updated!');
