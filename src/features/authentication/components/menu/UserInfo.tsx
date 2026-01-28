import { FunctionalComponent } from 'preact';

import personIcon from '@icons/person.svg';

import './user-info.css';

interface UserInfoProps {
    readonly name: string;
    readonly email: string;
    readonly avatar?: string;
}

export const UserInfo: FunctionalComponent<UserInfoProps> = ({ name, email, avatar }) => {
    return (
        <div class="account-menu__user" aria-label="User information">
            <div class="account-menu__user-icon" aria-hidden="true">
                {avatar ? (
                    <img 
                        src={avatar} 
                        alt="" 
                        class="account-menu__user-avatar"
                    />
                ) : (
                    <img 
                        src={personIcon} 
                        alt="" 
                        class="account-menu__user-avatar-placeholder"
                    />
                )}
            </div>
            <div class="account-menu__user-info">
                <div class="account-menu__user-name">{name}</div>
                <div class="account-menu__user-email">{email}</div>
            </div>
        </div>
    );
};
