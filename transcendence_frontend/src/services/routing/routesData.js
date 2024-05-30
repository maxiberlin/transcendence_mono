import { Router } from './Router.js';

const routes = [
    {path: "/",                          title: "Welcome to awesome Pong!",  component: "game-window"},
    {path: "/login",                     title: "Login",                     component: "login-register-route"},
    {path: "/logout",                    title: "",                          component: "login-register-route"},
    {path: "/register",                  title: "Register",                  component: "login-register-route"},
    {path: "/pwforgot",                  title: "Reset your Password",       component: "login-register-route"},

    {path: "/chat",                      title: "Chat",                      component: "chat-view"},
    
    {path: "/social",                    title: "Friendlist",                component: "friends-view"},
    {path: "/social/friends",            title: "Friendlist",                component: "friends-view"},
    {path: "/social/requests-received",  title: "Friendlist",                component: "friends-view"},
    {path: "/social/requests-sent",      title: "Friendlist",                component: "friends-view"},
    {path: "/social/blocked-users",      title: "Friendlist",                component: "friends-view"},
    {path: "/profile/edit",              title: "Profile ",                  component: "profile-settings-view"},

    {path: "/profile",                   title: "Profile ",                  component: "profile-view"},
    {path: "/profile/:pk",               title: "Profile ",                  component: "profile-view"},
];

export const router = new Router(routes);
