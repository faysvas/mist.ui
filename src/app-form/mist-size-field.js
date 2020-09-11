import '../../node_modules/@polymer/polymer/polymer-legacy.js';
import '../../node_modules/@polymer/paper-material/paper-material.js';
import '../../node_modules/@polymer/paper-button/paper-button.js';
import '../../node_modules/@polymer/paper-styles/typography.js';
import '../../node_modules/@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../../node_modules/@polymer/paper-item/paper-item.js';
import '../../node_modules/@polymer/paper-input/paper-input.js';
import '../../node_modules/@polymer/iron-icons/iron-icons.js';
import '../../node_modules/@polymer/paper-slider/paper-slider.js';
import '../../node_modules/@polymer/paper-listbox/paper-listbox.js';
import { Polymer } from '../../node_modules/@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '../../node_modules/@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
        <style include="shared-styles forms">
            :host>* {
                width: 100%;
            }

            paper-item.button-true {
                text-transform: uppercase;
            }
            paper-item.button-true.iron-selected {
                background-color: #2196F3 !important;
                color: #fff;
            }
            paper-slider ::slotted(#input) {
                width: 70px;
            }
            paper-input.search {
                padding-left: 16px;
                padding-right: 16px;
            }
            .label:first-of-type {
                margin-top: 24px;                
            }
        </style>

        <paper-dropdown-menu label="[[field.label]]" horizontal-align="left" disabled="[[field.disabled]]" required="[[field.required]]" hidden\$="[[_hideDropdown(field.options,field)]]">
            <div slot="dropdown-content" class="dropdown-content">
                <paper-input class="search" label\$="Search [[field.name]]s" value="{{field.search}}" data-options\$="[[field.name]]"></paper-input>
                <paper-listbox slot="dropdown-content" attr-for-selected="value" selected="{{field.value}}" class="dropdown-content">
                    <template is="dom-if" if="[[_noOptions(field.options.length)]]" restamp="">
                        <paper-item disabled="">No sizes found</paper-item>
                    </template>
                    <template is="dom-if" if="[[field.custom]]" restamp="">
                        <paper-item value="custom" class="button-true">Custom Size</paper-item>
                    </template>
                    <template is="dom-repeat" items="[[_filter(field.options, field.search)]]" as="option">
                        <paper-item value="[[option.id]]" disabled\$="[[option.disabled]]">
                            <span class="flex">[[showOption(option)]]</span>
                        </paper-item>
                    </template>
                </paper-listbox>
            </div>
        </paper-dropdown-menu>
        <template is="dom-if" if="[[_showCustomSizeFields(field.custom, field.value)]]" restamp="">
            <template is="dom-repeat" items="{{field.customSizeFields}}">
                <div class="label" hidden="[[item.hidden]]">[[item.label]]
                    <span class="field-helptext">min [[item.min]], max [[item.max]] [[item.unit]]</span>
                </div>
                <paper-slider id\$="[[id]]-[[field.name]]-[[item.name]]" disabled="[[item.disabled]]" hidden="[[item.hidden]]" min="[[item.min]]" max="[[item.max]]" value="{{item.value}}" step="[[item.step]]" pin="" snaps="" editable=""></paper-slider>
            </template>
        </template>
`,

  is: 'mist-size-field',

  properties: {
      id: {
          type: String
      },
      field: {
          type: Object,
          notify: true
      }
  },

  listeners: {
      'change': '_updateCustomValue'
  },

  observers: [
      '_updateCustomValue(field.customSizeFields.*)'
  ],

  showOption: function (option) {
      if (option.name)
          return option.name;
      if (option.id)
          return option.id;
  },

  _showCustomSizeFields: function(custom, value) {
      return this.field.custom && (!this.field.value || this.field.value == "custom")
  },

  _replaceAsterisk: function (str) {
      return str.replace(/_/g, " ").replace("*", "").replace("id", "").trim();
  },

  _hideDropdown: function(options, field) {
      return field.custom == true && (!this.field.options || this.field.options.length == 0);
  },

  _noOptions: function (options) {
      return !this.field.options || this.field.options.length == 0;
  },

  _allowCustom: function (field) {
      return field.custom == true || !this.field.options || !this.field.options.length;
  },

  _updateCustomValue: function (e) {
      if (!this.field.custom) {
          this.set('field.customValue', false);
      } else if (this.field.custom && this.field.customSizeFields) {
          var cv = {};
          for (var i=0; i<this.field.customSizeFields.length; i++){
              cv[this.field.customSizeFields[i].name] = this.field.customSizeFields[i].value;
          }
          this.set('field.customValue', cv);
      }
  },

  _resetField: function () {
      this.set('field.value', this.field.defaultValue);
  },

  _filter: function (options, search) {
      return options ? this._sort(options.filter(function (op) {
          return op.name && (!search || op.name.toLowerCase().indexOf(search.toLowerCase()) > -1);
      })) : [];
  },

  _sort: function(arr) {
      if (arr && arr.length)
          return arr.sort(function(a,b){
              if (a.cpus < b.cpus) {
                  return -1;
              }
              if (a.cpus > b.cpus) {
                  return 1;
              }
              return 0;
          })
      else
          return [];
  }
});