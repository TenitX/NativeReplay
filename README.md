# nativereplay

![animated-nativereplay-logo](https://github.com/TenitX/NativeReplay/assets/19876974/340a04b7-3928-4eb0-bb2d-f9ce1e96daa8)

Session Replays built for React Native

## Installation

```sh
npm install nativereplay
```

## Usage

In highest level of the app (likely `app.js`):
```js
import { NativeReplayProvider } from "nativereplay";
// ...
<NativeReplayProvider apiKey={NATIVE_REPLAY_TOKEN}>
    // ... rest of your app
</NativeReplayProvider>
```

On the different screens you want to track:
```js
import { addReplayTrackingProps, useNativeReplay } from "nativereplay";
// ...
const nativeReplayContext = useNativeReplay();
// ...
<View {...addReplayTrackingProps(nativeReplayContext, "the-screen-name")}>
</View>
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---
