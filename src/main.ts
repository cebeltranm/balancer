import { createApp } from 'vue'
import format from './format'
// import {createIntl} from 'vue-intl'

import App from './App.vue'
import router from './router'
// import { loadFonts } from './plugins/webfontloader'
import store from './store';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import StyleClass from 'primevue/styleclass';
import Ripple from 'primevue/ripple';

import Badge from 'primevue/badge';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Calendar from 'primevue/calendar';
import AutoComplete from 'primevue/autocomplete';
import InputNumber from 'primevue/inputnumber';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';     
import Row from 'primevue/row';
import Divider from 'primevue/divider';
import Dropdown from 'primevue/dropdown';
import TreeTable from 'primevue/treetable';
import Toolbar from 'primevue/toolbar';
import SelectButton from 'primevue/selectbutton';
import Chart from 'primevue/chart';
import TreeSelect from 'primevue/treeselect';
import ConfirmPopup from 'primevue/confirmpopup';
import Toast from 'primevue/toast';

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
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('ColumnGroup', ColumnGroup);
app.component('Row', Row);
app.component('Card', Card);
app.component('Divider', Divider);
app.component('Dropdown', Dropdown);
app.component('TreeTable', TreeTable);
app.component('Toolbar', Toolbar);
app.component('SelectButton', SelectButton);
app.component('Chart', Chart);
app.component('TreeSelect', TreeSelect);
app.component('ConfirmPopup', ConfirmPopup);
app.component('Toast', Toast);


app.config.globalProperties.$format = format
app.use(ConfirmationService);
app.use(ToastService);

app.mount('#app')
