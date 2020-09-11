import '../../node_modules/@polymer/polymer/polymer-legacy.js';
import '../../node_modules/@polymer/paper-dialog/paper-dialog.js';
import '../../node_modules/@polymer/paper-input/paper-input.js';
import '../../node_modules/@polymer/paper-input/paper-input-error.js';
import '../../node_modules/@polymer/paper-input/paper-textarea.js';
import '../../node_modules/@polymer/iron-ajax/iron-ajax.js';
import '../../node_modules/@mistio/mist-list/mist-list-actions.js';
import '../../node_modules/@mistio/mist-list/mist-list-actions-behavior.js';
import '../helpers/transfer-ownership.js';
import '../tags/tags-form.js';
import { Polymer } from '../../node_modules/@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '../../node_modules/@polymer/polymer/lib/utils/html-tag.js';
STACK_ACTIONS = {
    'deploy': {
        'name': 'deploy now',
        'icon': 'av:play-arrow',
        'confirm': false,
        'multi': false,
        'single': true
    },
    'workflows': {
        'name': 'workflows panel',
        'icon': 'icons:visibility',
        'confirm': false,
        'multi': false,
        'single': true
    },
    'tag': {
        'name': 'tag',
        'icon': 'label',
        'confirm': true,
        'multi': true
    },
    'transfer-ownership': {
        'name': 'transfer ownership',
        'icon': 'icons:redo',
        'confirm': false,
        'multi': true
    },
    'delete': {
        'name': 'delete',
        'icon': 'delete',
        'confirm': true,
        'multi': true
    }
}
Polymer({
  _template: html`
        <style include="shared-styles">
          mist-list-actions {
            width: 100%;
          }
    </style>
        <dialog-element id="confirm"></dialog-element>
        <transfer-ownership id="ownershipdialog" user="[[user]]" members="[[_otherMembers(members,items.length)]]" items="[[items]]" type="[[type]]"></transfer-ownership>
        <tags-form id="tagsdialog" model="[[model]]" items="[[items]]" type="[[type]]"></tags-form>
        <iron-ajax id="request" handle-as="json" loading="{{loadingData}}" on-response="handleResponse" on-error="handleError"></iron-ajax>
        <slot>
            <mist-list-actions actions="[[actions]]"></mist-list-actions>
        </slot>
`,

  is: 'stack-actions',

  properties: {
      user: {
          type: String,
      },
      members: {
          type: Array,
      },
      org: {
          type: Object,
      },
      items: {
          type: Array,
          value: []
      },
      actions: {
          type: Array,
          value: [],
          notify: true
      },
      type: {
          type: String,
          value: 'stack'
      },
      inSingleView: {
          type: Boolean,
          reflectToAttribute: true
      },
      workflows: {
          type: Array,
      },
      deployNow: {
          type: Boolean,
      },
  },

  observers: [
      '_mapPolicyToActions(items.*,user,org)'
  ],

  listeners: {
      'select-action': 'selectAction',
      'confirmation': 'confirmAction',
      'transfer-ownership': 'transferOwnership'
  },

  attached: function() {
      this.$.request.headers["Content-Type"] = 'application/json';
      this.$.request.headers["Csrf-Token"] = CSRF_TOKEN;
      this.$.request.method = "POST";
  },

  itemActions: function(stack, user) {
      var arr = [];
      if (stack) {
          if (this.inSingleView) {
              if (this.deployNow) {
                  arr.push('deploy');
              }
              if (stack.workflows) {
                  arr.push('workflows');
              }
          }
          arr.push('tag');
          if (this.org.ownership_enabled && (stack.owned_by == this.user || this.org.is_owner)) {
              arr.push('transfer-ownership');
          }
          arr.push('delete');
      }
      return arr;
  },

  transferOwnership: function(e) {
      var payload = {
          user_id: e.detail.user_id, //new owner
          resources: {}
      };
      payload.resources[this.type] = this.items.map(function(i) { return i.id });
      console.log('transferOwnership', e.detail, payload);
      this.$.request.url = '/api/v1/ownership';
      this.$.request.headers["Content-Type"] = 'application/json';
      this.$.request.headers["Csrf-Token"] = CSRF_TOKEN;
      this.$.request.method = "POST";
      this.$.request.body = payload;
      this.$.request.generateRequest();
  },

  actionDetails: function(actions) {
      var ret = [];
      if (this.workflows) {
          for (var i = 0; i < this.workflows.length; i++) {
              ret.push({
                  'name': this.workflows[i].name,
                  'icon': 'av:play-circle-outline',
                  'confirm': false,
                  'multi': false,
                  'single': true
              });
          }
      }
      for (var i = 0; i < actions.length; i++) {
          ret.push(STACK_ACTIONS[actions[i]]);
      }
      return ret;
  },

  _otherMembers: function(members, items) {
      if (this.items && members) {
          var owners = this.items.map(function(i) { return i.owned_by; })
              .filter(function(value, index, self) { return self.indexOf(value) === index; });
          // filter out pending users and the single owner of the item-set if that is the case
          return members.filter(function(m) {
              return owners.length == 1 ? m.id != owners[0] && !m.pending : !m.pending;
          });
      }
  },

  _delete: function() {
      //set up iron ajax
      this.$.request.headers["Content-Type"] = 'application/json';
      this.$.request.headers["Csrf-Token"] = CSRF_TOKEN;
      this.$.request.method = "DELETE";

      for (var i = 0; i < this.items.length; i++) {
          this.$.request.url = "/api/v1/stacks/" + this.items[i].id
          this.$.request.generateRequest();
          this.dispatchEvent(new CustomEvent('toast', { bubbles: true, composed: true, detail:  { msg: 'Deleting ' + this.items[i].name, duration: 1000 } }));
      }
  },

  _showDialog: function(info) {
      var dialog = this.shadowRoot.querySelector('dialog-element');
      for (var i in info) {
          dialog[i] = info[i];
      }
      dialog._openDialog();
  },

  confirmAction: function(e) {
      if (e.detail.confirmed)
          this.performAction(this.action, this.items);
  },

  selectAction: function(e) {
      if (this.items.length) {
          var action = e.detail.action;
          this.set('action', action);
          // console.log('perform action mist-action', this.items);
          if (action.confirm && action.name != 'tag') {
              var property = "name",
                  plural = this.items.length == 1 ? '' : 's',
                  count = this.items.length > 1 ? this.items.length + ' ' : '';
              //this.tense(this.action.name) + " " + this.type + "s can not be undone. 
              this._showDialog({
                  title: this.action.name + ' ' + count + this.type + plural + '?',
                  body: "You are about to " + this.action.name + " " + this.items.length + " " + this.type + plural + ".",
                  list: this._makeList(this.items, property),
                  action: action.name,
                  danger: true,
                  reason: this.type + "." + this.action.name
              });
          } else if (action.name == "tag") {
              this.$.tagsdialog._openDialog();
          } else if (action.name == 'transfer ownership') {
              this.$.ownershipdialog._openDialog();
          } else {
              this.performAction(this.action, this.items);
          }
      }
  },

  performAction: function(action, items) {
      if (action.name == 'delete') {
          this._delete();
      } else if (action.name == 'workflows panel') {
          this.dispatchEvent(new CustomEvent('show-workflows'));
      } else if (action.name == 'deploy now') {
          this.dispatchEvent(new CustomEvent('deploy-now'));
      } else {
          this.dispatchEvent(new CustomEvent('workflow', { bubbles: true, composed: true, detail:  { name: action.name } }));
      }
  },

  handleResponse: function(e) {
      if (this.$.request && this.$.request.body && this.$.request.body.action)
          this.dispatchEvent(new CustomEvent('toast', { bubbles: true, composed: true, detail:  { msg: 'Action: ' + this.$.request.body.action + ' successfull', duration: 3000 } }));
      if (e.detail.xhr.responseURL.endsWith("api/v1/ownership") && e.detail.xhr.status == 200) {
          this.$.ownershipdialog._closeDialog();
          this.dispatchEvent(new CustomEvent('action-finished'));
          this.dispatchEvent(new CustomEvent('toast', { bubbles: true, composed: true, detail: {
              msg: 'Successfull ownership transfer',
              duration: 3000
          } }));

      }
  },

  _mapPolicyToActions: function(items, user) {
      // recompute the actions array property as the intersection
      // of the available actions of the selected items
      this.set('actions', []);
      var actions = new swiftSet.Set(),
          isection = new swiftSet.Set();

      if (this.items.length > 0) {
          actions.addItems(this.itemActions(this.items[0]) || [], this.user);

          for (var i = 1; i < this.items.length; i++) {
              isection.clear()
              isection.addItems(actions.intersection(this.itemActions(this.items[i]), this.user));
              actions.clear();
              actions.addItems(isection.items());
          }

          var multiActions;

          if (this.items.length > 1) {
              multiActions = this.actionDetails(actions.items()).filter(function(a) {
                  return a.multi;
              });
          } else {
              multiActions = this.actionDetails(actions.items());
          }
      }
      this.set('actions', multiActions);
  },

  handleError: function(e) {
      console.log(e);
      this.dispatchEvent(new CustomEvent('toast', { bubbles: true, composed: true, detail: { msg: 'Error: ' + e.detail.request.xhr.status + " " + e.detail.request.xhr.statusText, duration: 5000 } }));

      if (e.detail.request.xhr.responseURL.endsWith("api/v1/ownership")) {
          this.$.ownershipdialog._closeDialog();
      }
  },

  _makeList: function(items, property) {
      if (items && items.length)
          return items.map(function(item) {
              return item[property];
          });
  }
});