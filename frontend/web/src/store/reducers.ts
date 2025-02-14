import { connectRouter } from 'connected-react-router';
import { combineReducers } from 'redux';

import {Action, ActionType, FileImportArgs, BuildParamsArgs, MonacoParamsChanges} from './actions';
import {
    EditorState,
    SettingsState,
    State,
    StatusState,
} from './state';
import {RunResponse, EvalEvent} from '../services/api';
import localConfig, {MonacoSettings, RuntimeType} from '../services/config'
import {mapByAction} from './helpers';
import config from "../services/config";

const reducers = {
    editor: mapByAction<EditorState>({
        [ActionType.FILE_CHANGE]: (s: EditorState, a: Action<string>) => {
            s.code = a.payload;
            return s;
        },
        [ActionType.IMPORT_FILE]: (s: EditorState, a: Action<FileImportArgs>) => {
            const {contents, fileName} = a.payload;
            console.log('Loaded file "%s"', fileName);
            return {
                code: contents,
                fileName,
            };
        },
        [ActionType.COMPILE_RESULT]: (s: EditorState, a: Action<RunResponse>) => {
            if (a.payload.formatted) {
                s.code = a.payload.formatted;
            }

            return s;
        },
    }, {fileName: 'gleam_project.gleam', code: ''}),
    status: mapByAction<StatusState>({
        [ActionType.COMPILE_RESULT]: (s: StatusState, a: Action<RunResponse>) => {
            return {
                loading: false,
                lastError: null,
                events: a.payload.events,
            }
        },
        [ActionType.IMPORT_FILE]: (s: StatusState, a: Action<string>) => {
            return {...s, loading: false, lastError: null}
        },
        [ActionType.ERROR]: (s: StatusState, a: Action<string>) => {
            return {...s, loading: false, lastError: a.payload}
        },
        [ActionType.LOADING]: (s: StatusState, _: Action<string>) => {
            return {...s, loading: true}
        },
        [ActionType.EVAL_START]: (s: StatusState, _: Action) => {
            return {lastError: null, loading: false, events: []}
        },
        [ActionType.EVAL_EVENT]: (s: StatusState, a: Action<EvalEvent>) => {
            return {lastError: null, loading: false, events: s.events?.concat(a.payload)}
        },
        [ActionType.EVAL_FINISH]: (s: StatusState, _: Action) => {
            return {...s, loading: false}
        },
        [ActionType.BUILD_PARAMS_CHANGE]: (s: StatusState, a: Action<BuildParamsArgs>) => {
            if (a.payload.runtime) {
                // Reset build output if build runtime was changed
                return {loading: false, lastError: null}
            }

            return s;
        },
    }, {loading: false}),
    settings: mapByAction<SettingsState>({
        [ActionType.TOGGLE_THEME]: (s: SettingsState, a: Action) => {
            s.darkMode = !s.darkMode;
            localConfig.darkThemeEnabled = s.darkMode;
            return s;
        },
        [ActionType.BUILD_PARAMS_CHANGE]: (s: SettingsState, a: Action<BuildParamsArgs>) => {
           return Object.assign({}, s, a.payload);
        },
    }, {darkMode: localConfig.darkThemeEnabled, autoFormat: true, runtime: RuntimeType.GleamPlayground}),
    monaco: mapByAction<MonacoSettings>({
        [ActionType.MONACO_SETTINGS_CHANGE]: (s: MonacoSettings, a: Action<MonacoParamsChanges>) => {
            return Object.assign({}, s, a.payload);
        }
    }, config.monacoSettings)
};

export const getInitialState = (): State => ({
    status: {
        loading: true
    },
    editor: {
        fileName: 'gleam_project.gleam',
        code: ''
    },
    settings: {
        darkMode: localConfig.darkThemeEnabled,
        autoFormat: localConfig.autoFormat,
        runtime: localConfig.runtimeType,
    },
    monaco: config.monacoSettings,
});

export const createRootReducer = history => combineReducers({
    router: connectRouter(history),
    ...reducers,
});
