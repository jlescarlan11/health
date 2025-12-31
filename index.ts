import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:5',message:'App entry point - checking runtime environment',data:{isExpoGo:Constants.executionEnvironment==='storeClient',executionEnvironment:Constants.executionEnvironment},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

import App from './App';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:10',message:'About to register root component',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
