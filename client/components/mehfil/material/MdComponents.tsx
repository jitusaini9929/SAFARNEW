import React from 'react';
import { createComponent } from '@lit/react';
import { MdChipSet } from '@material/web/chips/chip-set.js';
import { MdFilterChip } from '@material/web/chips/filter-chip.js';
import { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js';
import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdOutlinedButton } from '@material/web/button/outlined-button.js';
import { MdTextButton } from '@material/web/button/text-button.js';
import { MdIconButton } from '@material/web/iconbutton/icon-button.js';
import { MdSwitch } from '@material/web/switch/switch.js';
import { MdCheckbox } from '@material/web/checkbox/checkbox.js';
import { MdElevation } from '@material/web/elevation/elevation.js';
import { MdDivider } from '@material/web/divider/divider.js';
import { MdMenu } from '@material/web/menu/menu.js';
import { MdMenuItem } from '@material/web/menu/menu-item.js';

export const MdChipSetReact = createComponent({
  tagName: 'md-chip-set',
  elementClass: MdChipSet,
  react: React,
});

export const MdFilterChipReact = createComponent({
  tagName: 'md-filter-chip',
  elementClass: MdFilterChip,
  react: React,
  events: {
    onClick: 'click',
  },
});

export const MdOutlinedTextFieldReact = createComponent({
  tagName: 'md-outlined-text-field',
  elementClass: MdOutlinedTextField,
  react: React,
  events: {
    onInput: 'input',
  },
});

export const MdFilledButtonReact = createComponent({
  tagName: 'md-filled-button',
  elementClass: MdFilledButton,
  react: React,
  events: {
    onClick: 'click',
  },
});

export const MdOutlinedButtonReact = createComponent({
  tagName: 'md-outlined-button',
  elementClass: MdOutlinedButton,
  react: React,
  events: {
    onClick: 'click',
  },
});

export const MdTextButtonReact = createComponent({
  tagName: 'md-text-button',
  elementClass: MdTextButton,
  react: React,
  events: {
    onClick: 'click',
  },
});

export const MdIconButtonReact = createComponent({
  tagName: 'md-icon-button',
  elementClass: MdIconButton,
  react: React,
  events: {
    onClick: 'click',
  },
});

export const MdSwitchReact = createComponent({
  tagName: 'md-switch',
  elementClass: MdSwitch,
  react: React,
  events: {
    onChange: 'change',
    onClick: 'click',
  },
});

export const MdCheckboxReact = createComponent({
  tagName: 'md-checkbox',
  elementClass: MdCheckbox,
  react: React,
  events: {
    onChange: 'change',
    onClick: 'click',
  },
});

export const MdElevationReact = createComponent({
  tagName: 'md-elevation',
  elementClass: MdElevation,
  react: React,
});

export const MdDividerReact = createComponent({
  tagName: 'md-divider',
  elementClass: MdDivider,
  react: React,
});

export const MdMenuReact = createComponent({
  tagName: 'md-menu',
  elementClass: MdMenu,
  react: React,
  events: {
    onClosed: 'closed',
  },
});

export const MdMenuItemReact = createComponent({
  tagName: 'md-menu-item',
  elementClass: MdMenuItem,
  react: React,
  events: {
    onClick: 'click',
  },
});
