import GObject from 'gi://GObject';
import St from 'gi://St';
import NM from 'gi://NM';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

function _openNetwork() {
    new Gio.Subprocess({
        argv: ['gnome-control-center', 'network'],
        flags: Gio.SubprocessFlags.NONE,
    }).init(null);
}

function _openAdvancedNetwork() {
    new Gio.Subprocess({
        argv: ['nm-connection-editor'],
        flags: Gio.SubprocessFlags.NONE,
    }).init(null);
}

function getVlanConnections(client) {
    let connections = client.get_connections() || [];
    return connections.filter(c => c.is_type(NM.SETTING_VLAN_SETTING_NAME))
                      .sort((a, b) => a.get_id() > b.get_id() ? 1 : -1);
}

function addVlanSwitches(client, menu, section) {
    let vlans = getVlanConnections(client);
    let activeConnections = client.get_active_connections() || [];
    let anyActive = false;

    if (vlans.length === 0) {
        let item = new PopupMenu.PopupMenuItem(_("No VLAN found"));
        item.reactive = false;
        (section || menu).addMenuItem(item);
        return false;
    }

    vlans.forEach(vlan => {
        let activeVlan = activeConnections.find(ac =>
            ac && ac.connection && ac.connection.get_uuid() === vlan.get_uuid()
        );

        let isActive = activeVlan !== undefined &&
                       activeVlan.get_state() !== NM.ActiveConnectionState.DEACTIVATED;

        if (isActive) anyActive = true;

        let item = new PopupMenu.PopupSwitchMenuItem(vlan.get_id(), isActive);
        item._vlan = vlan;
        item._activeConnection = activeVlan;

        item.connect('toggled', () => {
            if (item._activeConnection !== undefined) {
                client.deactivate_connection_async(item._activeConnection, null, null);
            } else {
                client.activate_connection_async(vlan, null, null, null, null);
            }
        });

        (section || menu).addMenuItem(item);
    });

    return anyActive;
}

function addCommonMenus(menuOrSection, openExtensionPrefs) {
    menuOrSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    let preferencesItem = new PopupMenu.PopupMenuItem(_('Preferences'));
    preferencesItem.connect('activate', () => _openNetwork());
    menuOrSection.addMenuItem(preferencesItem);

    let advancedItem = new PopupMenu.PopupMenuItem(_('Advanced Network'));
    advancedItem.connect('activate', () => _openAdvancedNetwork());
    menuOrSection.addMenuItem(advancedItem);

    let extensionPrefsItem = new PopupMenu.PopupMenuItem(_('Extension Preferences'));
    extensionPrefsItem.connect('activate', () => openExtensionPrefs());
    menuOrSection.addMenuItem(extensionPrefsItem);
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(client, openExtensionPrefs) {
            super._init(0.0, _('VLAN'));

            this._client = client;
            this._openExtensionPrefs = openExtensionPrefs;

            let icon = new St.Icon({
                icon_name: 'network-transmit-receive-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(icon);

            this._activeConnectionsId = this._client.connect('notify::active-connections', () => this._refresh());
            this._connectionsId = this._client.connect('notify::connections', () => this._refresh());

            this._refresh();
        }

        _refresh() {
            this.menu.removeAll();
            addVlanSwitches(this._client, this.menu, null);
            addCommonMenus(this.menu, this._openExtensionPrefs);
        }

        destroy() {
            if (this._activeConnectionsId) this._client.disconnect(this._activeConnectionsId);
            if (this._connectionsId) this._client.disconnect(this._connectionsId);
            super.destroy();
        }
    }
);

const VlanQuickToggle = GObject.registerClass({
    GTypeName: 'VlanQuickToggle'
}, class VlanQuickToggle extends QuickSettings.QuickMenuToggle {
    _init(client, openExtensionPrefs) {
        super._init({ title: _('VLAN'), toggleMode: false });

        this._client = client;
        this._openExtensionPrefs = openExtensionPrefs;
        this._lastActiveVlans = [];

        this.set({ iconName: 'network-transmit-receive-symbolic' });
        this.menu.setHeader('network-transmit-receive-symbolic', _('VLAN'), _('Manage VLANs'));

        this._section = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._section);

        // Global toggle logic (Fixed from 'activate' to 'clicked')
        this.connect('clicked', () => {
            let activeConnections = this._client.get_active_connections() || [];
            let activeVlanConns = activeConnections.filter(ac =>
                ac && ac.connection && ac.connection.is_type(NM.SETTING_VLAN_SETTING_NAME)
            );

            if (activeVlanConns.length > 0) {
                // Deactivate all and save current state
                this._lastActiveVlans = activeVlanConns.map(ac => ac.connection.get_uuid());
                activeVlanConns.forEach(ac => {
                    this._client.deactivate_connection_async(ac, null, null);
                });
            } else {
                // Activate the ones that were previously active
                let connections = this._client.get_connections() || [];
                let toActivate = connections.filter(c =>
                    c.is_type(NM.SETTING_VLAN_SETTING_NAME) &&
                    this._lastActiveVlans.includes(c.get_uuid())
                );

                // Fallback: If there is no history, activate all
                if (this._lastActiveVlans.length === 0 && toActivate.length === 0) {
                    toActivate = connections.filter(c => c.is_type(NM.SETTING_VLAN_SETTING_NAME));
                }

                toActivate.forEach(conn => {
                    this._client.activate_connection_async(conn, null, null, null, null);
                });
            }
        });

        this._activeConnectionsId = this._client.connect('notify::active-connections', () => this._refresh());
        this._connectionsId = this._client.connect('notify::connections', () => this._refresh());

        this._refresh();
    }

    _refresh() {
        this._section._getMenuItems().forEach(i => i.destroy());
        let anyActive = addVlanSwitches(this._client, null, this._section);
        addCommonMenus(this._section, this._openExtensionPrefs);

        // Sync the button color (blue/grey) with the real state of the VLANs
        this.checked = anyActive;
    }

    destroy() {
        if (this._activeConnectionsId) this._client.disconnect(this._activeConnectionsId);
        if (this._connectionsId) this._client.disconnect(this._connectionsId);
        super.destroy();
    }
});

const VlanSystemIndicator = GObject.registerClass({
    GTypeName: 'VlanSystemIndicator'
}, class VlanSystemIndicator extends QuickSettings.SystemIndicator {
    _init(client, openExtensionPrefs) {
        super._init();

        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'network-transmit-receive-symbolic';

        this.quickSettingsItems.push(
            new VlanQuickToggle(client, openExtensionPrefs)
        );

        QuickSettingsMenu.addExternalIndicator(this);
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
        super.destroy();
    }
});

export default class EnhancedVlanSwitcherExtension extends Extension {
    enable() {
        this.client = NM.Client.new(null);
        this._settings = this.getSettings();

        this._settingsChangedId = this._settings.connect('changed', () => {
            this._updateUI();
        });

        this._openExtensionPrefs = () => {
            this.openPreferences();
        };

        this._updateUI();
    }

    _updateUI() {
        const showPanel = this._settings.get_boolean('show-panel-button');
        const showQuickSettings = this._settings.get_boolean('show-quick-settings');

        if (showPanel && !this._indicator) {
            this._indicator = new Indicator(this.client, this._openExtensionPrefs);
            Main.panel.addToStatusArea('vlan-indicator', this._indicator);
        } else if (!showPanel && this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (showQuickSettings && !this._vlanSystemIndicator) {
            this._vlanSystemIndicator = new VlanSystemIndicator(this.client, this._openExtensionPrefs);
        } else if (!showQuickSettings && this._vlanSystemIndicator) {
            this._vlanSystemIndicator.destroy();
            this._vlanSystemIndicator = null;
        }
    }

    disable() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._vlanSystemIndicator) {
            this._vlanSystemIndicator.destroy();
            this._vlanSystemIndicator = null;
        }

        this._settings = null;
        this.client = null;
    }
}
