# Enhanced VLAN Switcher

### An enhanced GNOME extension to activate and deactivate VLAN connections from the system panel or top bar.

## Dropdown menu

<img src="./IMG/Toggle-Dropdown.png" alt="Dropdown Toggle">

## Topbar option

<img src="./IMG/Toggle-Bar.png" alt="Topbar Toggle">

## Usage

Dropdown menu and Topbar icon have direct link to: 

- System preferences
- Advanced Network (nm-connection-editor)
- Extension preferences

You can toggle on/off both, Dropdown and Topbar icon in extension preferences:

<img src="./IMG/Settings.png" alt="Settings">

You first need to create the VLANs with your preferred tool, such as `nm-connection-editor`, otherwise nothing will be displayed.

## Installation from source

```bash
cd ~/.local/share/gnome-shell/extensions/
rm -r enhanced-vlan-switcher@tiagocasalribeiro.github.io
git clone https://github.com/tiagocasalribeiro/GNOME_VLAN_Toggle enhanced-vlan-switcher@tiagocasalribeiro.github.io

cd enhanced-vlan-switcher@tiagocasalribeiro.github.io
glib-compile-schemas schemas/
```

Now log out and log back in to reload the extensions.

## Installation from GNOME Extension Manager/Store

[GNOME Extension](https://extensions.gnome.org/extension/10907/enhanced-vlan-switcher/)

## License

Forked from 'u/JrVolt' [Updated VLAN Switcher ](https://github.com/JrVolt/GNOME_VLAN_Toggle)
<br>
[GPLv3](http://www.gnu.org/licenses/gpl-3.0.en.html)
