import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import { StackNavigator } from 'react-navigation';
import { addNavigationHelpers } from 'react-navigation';
import { Log } from 'src/log.js'
import { Note } from 'src/models/note.js'
import { Folder } from 'src/models/folder.js'
import { Database } from 'src/database.js'
import { Registry } from 'src/registry.js'
import { ItemList } from 'src/components/item-list.js'
import { NotesScreen } from 'src/components/screens/notes.js'
import { NoteScreen } from 'src/components/screens/note.js'
import { FolderScreen } from 'src/components/screens/folder.js'
import { FoldersScreen } from 'src/components/screens/folders.js'
import { LoginScreen } from 'src/components/screens/login.js'
import { Setting } from 'src/models/setting.js'

let defaultState = {
	notes: [],
	folders: [],
	selectedNoteId: null,
	selectedFolderId: null,
	listMode: 'view',
};

const reducer = (state = defaultState, action) => {
	Log.info('Reducer action', action);

	let newState = state;

	switch (action.type) {

		case 'Navigation/NAVIGATE':
		case 'Navigation/BACK':

			// If the current screen is already the requested screen, don't do anything
			const r = state.nav.routes;
			if (r.length && r[r.length - 1].routeName == action.routeName) {
				return state
			}

			action.params = { listMode: 'view' };

			const nextStateNav = AppNavigator.router.getStateForAction(action, state.nav);			
			newState = Object.assign({}, state);
			if (nextStateNav) {
				newState.nav = nextStateNav;
			}

			if ('noteId' in action) {
				newState.selectedNoteId = action.noteId;
			}

			if ('folderId' in action) {
				newState.selectedFolderId = action.folderId;
			}

			break;

		// Replace all the notes with the provided array
		case 'NOTES_UPDATE_ALL':

			newState = Object.assign({}, state);
			newState.notes = action.notes;
			break;

		// Insert the note into the note list if it's new, or
		// update it within the note array if it already exists.
		case 'NOTES_UPDATE_ONE':

			let newNotes = state.notes.splice(0);
			var found = false;
			for (let i = 0; i < newNotes.length; i++) {
				let n = newNotes[i];
				if (n.id == action.note.id) {
					newNotes[i] = action.note;
					found = true;
					break;
				}
			}

			if (!found) newNotes.push(action.note);

			newState = Object.assign({}, state);
			newState.notes = newNotes;
			break;

		case 'FOLDERS_UPDATE_ALL':

			newState = Object.assign({}, state);
			newState.folders = action.folders;
			break;

		case 'FOLDERS_UPDATE_ONE':

			let newFolders = state.folders.splice(0);
			var found = false;
			for (let i = 0; i < newFolders.length; i++) {
				let n = newFolders[i];
				if (n.id == action.folder.id) {
					newFolders[i] = action.folder;
					found = true;
					break;
				}
			}

			if (!found) newFolders.push(action.folder);

			newState = Object.assign({}, state);
			newState.folders = newFolders;
			break;

		case 'SET_LIST_MODE':

			newState = Object.assign({}, state);
			newState.listMode = action.listMode;
			newState.nav = Object.assign({}, state.nav);
			break;

	}

	return newState;
}

let store = createStore(reducer);

const AppNavigator = StackNavigator({
	Notes: {screen: NotesScreen},
	Note: {screen: NoteScreen},
	Folder: {screen: FolderScreen},
	Folders: {screen: FoldersScreen},
	Login: {screen: LoginScreen},
});

class AppComponent extends React.Component {

	componentDidMount() {
		let db = new Database();
		db.setDebugEnabled(Registry.debugMode());

		db.open().then(() => {
			Log.info('Database is ready.');
			Registry.setDb(db);
		}).then(() => {
			Log.info('Loading settings...');
			return Setting.load();
		}).then(() => {
			Log.info('Client ID', Setting.value('clientId'));
			Log.info('Loading folders...');

			Folder.all().then((folders) => {
				this.props.dispatch({
					type: 'FOLDERS_UPDATE_ALL',
					folders: folders,
				});
			}).catch((error) => {
				Log.warn('Cannot load folders', error);
			});
		}).catch((error) => {
			Log.error('Cannot initialize database:', error);
		});
	}

	render() {
		return (
				<AppNavigator navigation={addNavigationHelpers({
					dispatch: this.props.dispatch,
					state: this.props.nav,
				})} />
		);
	}
}

defaultState.nav = AppNavigator.router.getStateForAction({
	type: 'Navigation/NAVIGATE',
	routeName: 'Folders',
	params: {listMode: 'view'}
});

const mapStateToProps = (state) => {
	return {
  		nav: state.nav
  	};
};

const App = connect(mapStateToProps)(AppComponent);

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}

export { Root };