/* eslint-disable no-unused-vars */
import '../scss/custom.scss'
// import * as Popper from "@popperjs/core"
import * as bootstrap from 'bootstrap'
// import 'bootstrap'

import { sessionService } from './services/api/API_new.js';
import router from './services/router.js';

// Components
import BsButton from './components/bootstrap/BsButton.js';
import { BsCard } from './components/bootstrap/BsCard.js';
import BsDropDown from './components/bootstrap/BsDropDown.js';
import BsModal from './components/bootstrap/BsModal.js';
import BsToasts from './components/bootstrap/BsToasts.js';
import AvatarComponent from './components/bootstrap/AvatarComponent.js';
import * as u from './components/utils.js';
import { VerticalNav } from './components/Navs.js';

// Routes Web Components
import TimerComp from './components/TimerComp';
import PongApp from './routes/root.js';
import LoginRegisterRoute from './routes/auth/LoginRegisterRoute.js';
import PongBg from './routes/auth/PongBg.js';
import GameWindow from './routes/home/GameWindow.js';
// import GameModalRemote from './routes/home/PongGame_remote.js';
import GameModal from './routes/home/PongGame.js';
import GameModal2 from './routes/home/PongGame_other_layout';
import { ProfileView } from './routes/profile/ProfileView.js';
import ProfileSearch from './routes/social/ProfileSearch.js';
import FriendsView from './routes/social/FriendsView.js';
import ChatView from './routes/social/ChatView.js';
import GameInvite from './routes/home/GameInvite.js';
import { SettingsView } from './routes/profile/SettingsView.js';
import { NotificationView } from './routes/notifications/NotificationView';


const onDomLoaded = async () => {
    await sessionService.login();
    console.log('DOM LOADED');
    router.init('pong-app');
    // document.body.appendChild(document.createElement('pong-app'));
    // router.init("pong-app");
};

document.addEventListener('DOMContentLoaded', () => {
    onDomLoaded();
});
