import { createApp } from 'vue'
import format from './format'
// import {createIntl} from 'vue-intl'

import App from './App.vue'
import router from './router'

import { Form, FormField } from '@primevue/forms';
// import { loadFonts } from './plugins/webfontloader'
import store from './store';
import PrimeVue from 'primevue/config';
import Theme from '@primeuix/themes/lara';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import StyleClass from 'primevue/styleclass';
import Ripple from 'primevue/ripple';
import Tooltip from 'primevue/tooltip';
import BadgeDirective from 'primevue/badgedirective';

import Badge from 'primevue/badge';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import AutoComplete from 'primevue/autocomplete';
import InputNumber from 'primevue/inputnumber';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ColumnGroup from 'primevue/columngroup';     
import Row from 'primevue/row';
import Divider from 'primevue/divider';
import Select from 'primevue/select';
import TreeTable from 'primevue/treetable';
import Toolbar from 'primevue/toolbar';
import SelectButton from 'primevue/selectbutton';
import Chart from 'primevue/chart';
import TreeSelect from 'primevue/treeselect';
import ConfirmPopup from 'primevue/confirmpopup';
import Toast from 'primevue/toast';
import ProgressBar from 'primevue/progressbar';
import Chip from 'primevue/chip';
import MultiSelect from 'primevue/multiselect';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import ContextMenu from 'primevue/contextmenu';
import Popover from 'primevue/popover';
import Message from 'primevue/message';
import Fluid from 'primevue/fluid';
import FloatLabel from 'primevue/floatlabel';

import { GChart } from 'vue-google-charts'

const app = createApp(App);
app.use(router)
app.use(store)
app.use(PrimeVue,  { 
    ripple: true, inputStyle: 'outlined', condensed: true,
    theme: {
        preset: Theme,
        options: {
            prefix: 'p',
            darkModeSelector: 'system',
            cssLayer: false
        }
    }
})

app.directive('styleclass', StyleClass);
app.directive('ripple', Ripple);
app.directive('tooltip', Tooltip);
app.directive('badge', BadgeDirective);

app.component('Badge', Badge);
app.component('Dialog', Dialog);
app.component('Button', Button);
app.component('InputText', InputText);
app.component('Textarea', Textarea);
app.component('DatePicker', DatePicker);
app.component('AutoComplete', AutoComplete);
app.component('InputNumber', InputNumber);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('ColumnGroup', ColumnGroup);
app.component('Row', Row);
app.component('Card', Card);
app.component('Divider', Divider);
app.component('Select', Select);
app.component('TreeTable', TreeTable);
app.component('Toolbar', Toolbar);
app.component('SelectButton', SelectButton);
app.component('Chart', Chart);
app.component('TreeSelect', TreeSelect);
app.component('ConfirmPopup', ConfirmPopup);
app.component('Toast', Toast);
app.component('ProgressBar', ProgressBar);
app.component('Chip', Chip);
app.component('GChart', GChart);
app.component('MultiSelect', MultiSelect);
app.component('Avatar', Avatar);
app.component('Menu', Menu);
app.component('ContextMenu', ContextMenu);
app.component('Popover', Popover);
app.component('Form', Form);
app.component('FormField', FormField);
app.component('Message', Message);
app.component('Fluid', Fluid);
app.component('FloatLabel', FloatLabel);


app.config.globalProperties.$format = format
app.use(ConfirmationService);
app.use(ToastService);

app.mount('#app')
