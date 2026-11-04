const gh = require('react-native-gesture-handler');
console.log('Gesture keys:', Object.keys(gh.Gesture));
const pan = gh.Gesture.Pan();
console.log('pan.simultaneousWithExternalGesture is:', typeof pan.simultaneousWithExternalGesture);
console.log('pan.minDistance is:', typeof pan.minDistance);
console.log('pan.runOnJS is:', typeof pan.runOnJS);
