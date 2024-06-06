/* eslint-disable no-unused-vars */
import { sessionService } from './services/api/API.js';
import router from './services/router.js';

// Components
import BsButton from './components/bootstrap/BsButton.js';
import { BsCard } from './components/bootstrap/BsCard.js';
import { GameMenu } from './routes/home/GameMenu.js';
import BsDropDown from './components/bootstrap/BsDropDown.js';
import BsModal from './components/bootstrap/BsModal.js';
import BsToasts from './components/bootstrap/BsToasts.js';
import AvatarComponent from './components/bootstrap/AvatarComponent.js';
import { actions, renderDropdow } from './components/ActionButtons.js';
import * as u from './components/utils.js';

// Routes Web Components
import PongApp from './routes/root.js';
import LoginRegisterRoute from './routes/auth/LoginRegisterRoute.js';
import PongBg from './routes/auth/PongBg.js';
import GameWindow from './routes/home/GameWindow.js';
import GameModalRemote from './routes/home/PongGame_remote.js';
import { ProfileView } from './routes/profile/ProfileView.js';
import ProfileSearch from './routes/social/ProfileSearch.js';
import FriendsView from './routes/social/FriendsView.js';
import ChatView from './routes/social/ChatView.js';

const onDomLoaded = async () => {
    await sessionService.fetchActiveSession();
    // console.log('DOM LOADED');
    router.init('pong-app');
    // document.body.appendChild(document.createElement('pong-app'));
    // router.init("pong-app");
};

document.addEventListener('DOMContentLoaded', () => {
    onDomLoaded();
});
