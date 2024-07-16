import Router from '../lib_templ/router/Router.js';

const routes = [
    {
        path: '/',
        component: 'game-window',
        title: 'Welcome to awesome Pong!',
    },
    {
        path: '/login',
        component: 'login-register-route',
        title: 'Login',
    },
    {
        path: '/logout',
        component: 'login-register-route',
        title: '',
    },
    {
        path: '/register',
        component: 'login-register-route',
        title: 'Register',
    },
    {
        path: '/pwforgot',
        component: 'login-register-route',
        title: 'Reset your Password',
    },
    {
        path: '/chat',
        component: 'chat-view',
        title: 'Chat',
    },

    {
        path: '/social',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/friends',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/requests-received',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/requests-sent',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/social/blocked-users',
        component: 'friends-view',
        title: 'Friendlist',
    },
    {
        path: '/profile/settings',
        component: 'settings-view',
        title: 'Profile ',
    },
    {
        path: '/profile/settings/:id',
        component: 'settings-view',
        title: 'Profile ',
    },
    {
        path: '/profile',
        component: 'profile-view',
        title: 'Profile ',
    },
    {
        path: '/profile/:pk',
        component: 'profile-view',
        title: 'Profile ',
    },
    {
        path: '/games/:game',
        component: 'game-invite',
        title: 'Game View ',
    },
];

const router = new Router(routes);

export default router;
