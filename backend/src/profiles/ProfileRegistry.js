import { PROFILES, DEFAULT_PROFILE } from './constants.js';
import flashConfig from './flash.js';
import thinkingConfig from './thinking.js';

export default class ProfileRegistry {
    constructor() {
        this.profiles = {
            [PROFILES.FLASH]: flashConfig,
            [PROFILES.THINKING]: thinkingConfig
        };
    }

    get(profileName) {
        return this.profiles[profileName] || null;
    }

    getDefault() {
        return this.profiles[DEFAULT_PROFILE];
    }
    
    isValid(profileName) {
        return profileName in this.profiles;
    }
}
