import '../../node_modules/@polymer/polymer/polymer-legacy.js';
/**
 * Behavior that enables the owner filter behavior for lists.
 *
 * @polymerBehavior
 */
export const ownerFilterBehavior = {
    properties: {},
    _ownerFilter: function () {
        var _this = this;
        return {
            'apply': function(item,query) {
                var q = query.slice(0) || '',
                    filterOwner = query.indexOf('owner:')>-1,
                    ownerRegex = /owner:(\S*)\s?/;

                if (filterOwner && q) {
                    if (ownerRegex.exec(q).length) {
                        var owner = ownerRegex.exec(q)[1];
                        if (owner) {
                            if (owner == "$me"){
                                if (!item || !item.owned_by || item.owned_by != _this.model.user.id)
                                    return false;
                            }
                            else {
                                var ownerObj = _this.model.membersArray.find(function(m){
                                    return [m.name, m.email, m.username, m.id].indexOf(owner) > -1;
                                });
                                if (!ownerObj || !item.owned_by || item.owned_by != ownerObj.id)
                                    return false;
                            }
                            q = q.replace('owner:','').replace(owner,'');
                            return q;
                        }
                    }
                }
                return query;
            }
        }
    }
};