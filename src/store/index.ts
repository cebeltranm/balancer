import { createStore } from 'vuex';
import storage from './storage';
import accounts from './accounts';
import budget from './budget';
import values from './values';
import transactions from './transactions';
import balance from './balance';
import config from './config';

export default createStore({
    modules: {
        storage,
        accounts,
        budget,
        values,
        transactions,
        balance,
        config,
    }
});