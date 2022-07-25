import { createApp } from 'vue'
// import {createIntl} from 'vue-intl'

import App from './App.vue'
import router from './router'
// import { loadFonts } from './plugins/webfontloader'
import store from './store';
import PrimeVue from 'primevue/config';

import StyleClass from 'primevue/styleclass';
import Ripple from 'primevue/ripple';

import Badge from 'primevue/badge';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
import AutoComplete from 'primevue/autocomplete';
import InputNumber from 'primevue/inputnumber';

const app = createApp(App);
app.use(router)
app.use(store)
app.use(PrimeVue,  { ripple: true, inputStyle: 'outlined' })
  // .use(
  //   createIntl({
  //     locale: 'en',
  //     defaultLocale: 'en',
  //     messages: {},
  //   })
  // )

app.directive('styleclass', StyleClass);
app.directive('ripple', Ripple);

app.component('Badge', Badge);
app.component('Dialog', Dialog);
app.component('Button', Button);
app.component('InputText', InputText);
app.component('Calendar', Calendar);
app.component('AutoComplete', AutoComplete);
app.component('InputNumber', InputNumber);


app.mount('#app')
