import { Dimensions, Platform } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import axios from 'axios';
import React, { useContext } from 'react';

// Config
let ReplayConfig = {
  apiKey: '',
  sampleRate: 1.0,
};

export const NativeReplayContext = React.createContext({
  apiKey: '',
});

export const NativeReplayProvider = ({ apiKey, children }: any) => {
  /**
   * Using react hooks, set the default state
   */
  //  const [state, setState] = useState({});

  //  /**
  //   * Declare the update state method that will handle the state values
  //   */
  //  const updateState = (newState: Partial<AppState>) => {
  //    setState({ ...state, ...newState });
  //  }

  return (
    <NativeReplayContext.Provider value={{ apiKey }}>
      {children}
    </NativeReplayContext.Provider>
  );
};

export function useNativeReplay() {
  return useContext(NativeReplayContext);
}

// API
const apiCaller = (context: any) =>
  axios.create({
    baseURL: 'https://api.tenitx.com',
    headers: {
      'x-tenit-api-token': getToken(context),
    },
  });

const formApiCaller = (formData: any, context: any) =>
  axios.create({
    baseURL: 'https://api.tenitx.com',
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-tenit-api-token': getToken(context),
    },
    transformRequest: () => {
      return formData; // this is doing the trick
    },
  });

function getToken(context: any = NativeReplayContext) {
  context.apiKey;
  if (context.apiKey && context.apiKey !== '') {
    return context.apiKey;
  }
  console.error(
    'Missing token for NativeReplay. Set the token using <NativeReplayProvider apiKey={apiKey}/>'
  );
  return '';
}

export function init(token: string) {
  ReplayConfig.apiKey = token;
}

export function setSampleRate(sampleRate: number) {
  ReplayConfig.sampleRate = sampleRate;
}

// Session Tracking
let sessionId: string;

let baseTime = new Date().getTime();

let isSamplingThisSession = false;

const shouldSample = () => {
  return isSamplingThisSession;
};

const getTimeOffset = () => {
  return new Date().getTime() - baseTime;
};

const uploadSegment = async (context: any, request: any) => {
  if (!shouldSample()) {
    return;
  }
  request = request.request;
  const id = await getOrCreateSessionId();
  const formData = new FormData();
  for (const [key, value] of Object.entries(request)) {
    if (key !== 'image') {
      formData.append(key, value);
    }
  }
  formData.append('file', {
    type: 'image/jpeg',
    name: 'screen-cap.jpg',
    uri: request.image,
  });
  try {
    formApiCaller(formData, context).post(
      `/session-replay/v1/replay-ingestion/${id}/segment`,
      formData
    );
  } catch (e) {
    console.error(e);
    console.info(`Segment upload error`, JSON.stringify(e));
  }
};

const createSession = async (context: any, session: any) => {
  ReplayConfig.apiKey = context.apiKey;
  if (!shouldSample()) {
    return;
  }
  try {
    apiCaller(context)
      .post(`/session-replay/v1/replay-ingestion/session`, session)
      .catch((e) => {
        console.error(e);
        console.info(`createSession error`, JSON.stringify(e));
      });
  } catch (e) {
    console.error(e);
    console.info(`createSession error`, JSON.stringify(e));
  }
};

function makeid(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

async function getOrCreateSessionId() {
  return sessionId;
}

async function recordResponseToTap(context: any, screen: string) {
  if (!shouldSample()) {
    return;
  }
  setTimeout(async () => {
    const imageUri = await captureAndUploadScreenshot();
    uploadSegment(context, {
      request: {
        x: 0,
        y: 0,
        image: imageUri,
        time: getTimeOffset(),
        screen: screen,
      },
    });
  }, 250);
}

async function handleTouchEvent(context: any, screen: string) {
  ReplayConfig.apiKey = context.apiKey;
  if (!shouldSample()) {
    return;
  }

  // const width = Dimensions.get('window').width;
  // const height = Dimensions.get('window').height;
  const imageUri = await captureAndUploadScreenshot();

  // const wR = event.pageX / width;
  // const hR = event.pageY / height;

  uploadSegment(context, {
    request: {
      x: 0,
      y: 0,
      image: imageUri,
      time: getTimeOffset(),
      screen: screen,
    },
  });
  recordResponseToTap(context, screen);
}

export async function startNewSession(
  context: any,
  userId: string,
  applicationVersion: string
) {
  const sampleRate = ReplayConfig.sampleRate * 100;
  const sampleNum = Math.floor(Math.random() * 100) + 1;

  if (sampleRate >= sampleNum) {
    isSamplingThisSession = true;
  } else {
    isSamplingThisSession = false;
    return;
  }

  sessionId = makeid(32);
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;

  await createSession(context, {
    sessionId: sessionId,
    userId: userId,
    platform: Platform.OS,
    version: applicationVersion,
    width: width,
    height: height,
  });
  return sessionId;
}

export async function captureAndUploadScreenshot() {
  if (!shouldSample()) {
    return;
  }

  const height = Dimensions.get('window').height;
  const width = Dimensions.get('window').width;

  const h = 500.0;

  const ratio = h / height;

  const localUri = await captureScreen({
    height: h,
    width: width * ratio,
    quality: 0.1,
    format: 'jpg',
    result: 'tmpfile',
  });
  return localUri;
}

export const addReplayTrackingProps = (context: any, screen: string) => {
  return {
    onTouchStart: async () => handleTouchEvent(context, screen),
    // onTouchEnd: async ({ nativeEvent }) => handleTouchEvent({event: nativeEvent})
  };
};

export async function uploadAutoSegment(context: any, imageUri: string) {
  uploadSegment(context, {
    request: {
      x: 0,
      y: 0,
      image: imageUri,
      time: getTimeOffset(),
      screen: 'some-screen',
    },
  });
}

export async function recordUIUpdate(context: any) {
  if (!shouldSample()) {
    return;
  }
  setTimeout(async () => {
    const imageUri = await captureAndUploadScreenshot();
    uploadSegment(context, {
      request: {
        x: 0,
        y: 0,
        image: imageUri,
        time: getTimeOffset(),
        screen: 'some-screen',
      },
    });
  }, 500);
}
