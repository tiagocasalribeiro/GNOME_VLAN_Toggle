import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class EnhancedVlanSwitcherPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.enhanced-vlan-switcher');

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: _('Display Options'),
            description: _('Configure where Enhanced VLAN Switcher appears'),
        });
        page.add(group);

        // Panel button toggle
        const panelButtonRow = new Adw.SwitchRow({
            title: _('Show Panel Button'),
            subtitle: _('Display VLAN toggle in the top panel'),
        });
        settings.bind('show-panel-button', panelButtonRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        group.add(panelButtonRow);

        // QuickSettings toggle
        const quickSettingsRow = new Adw.SwitchRow({
            title: _('Show in System Menu'),
            subtitle: _('Display VLAN in the system menu'),
        });
        settings.bind('show-quick-settings', quickSettingsRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        group.add(quickSettingsRow);

        window.add(page);
    }
}
