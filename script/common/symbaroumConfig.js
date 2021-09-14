export class SymbaroumConfig extends FormApplication {
  static get getDefaults() {
    return {
      addMenuButton: true,
    };
  }

  // * Creates or removes the quick access config button
  // * @param  {Boolean} shown true to add, false to remove

  static toggleConfigButton(shown) {
    const button = $('#SymbaroumButton');
    if (button) button.remove();

    if (shown) {
      const title = game.i18n.localize('SYMBAROUM.OPTIONAL_CONFIG_MENULABEL');

      $(`<button id="SymbaroumButton" data-action="symbaroumConfig" title="${title}">
       <i class="fas fa-palette"></i> ${title}
     </button>`)
        .insertAfter('button[data-action="configure"]')
        .on('click', (event) => {
          const menu = game.settings.menus.get('symbaroum.symbaroumSettings');
          if (!menu) return ui.notifications.error('No submenu found for the provided key');
          const app = new menu.type();
          return app.render(true);
        });
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('SYMBAROUM.OPTIONAL_CONFIG_MENULABEL'),
      id: 'symbaroumSettings',
      icon: 'fas fa-cogs',
      template: 'systems/symbaroum/template/symbaroumSettings.html',
      width: 700,
      height: 600,
      closeOnSubmit: true,
    });
  }

  getData(options) {
    return foundry.utils.mergeObject({
      charBGChoice: game.settings.get('symbaroum', 'charBGChoice'),
      charBGColour: game.settings.get('symbaroum', 'switchCharBGColour'),
      npcBGChoice: game.settings.get('symbaroum', 'npcBGChoice'),
      npcBGColour: game.settings.get('symbaroum', 'switchNpcBGColour'),
      titleBGChoice: game.settings.get('symbaroum', 'titleBGChoice'),
      titleBGColour: game.settings.get('symbaroum', 'switchTitleColour'),
      editableChoice: game.settings.get('symbaroum', 'editableChoice'),
      editableColour: game.settings.get('symbaroum', 'switchEditableColour'),
      noneditableChoice: game.settings.get('symbaroum', 'nonEditableChoice'),
      noneditableColour: game.settings.get('symbaroum', 'switchNoNEditableColour'),
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    // html.find('#charBGImage').change(this._showPCColOption.bind(this));
    // html.find('#npcBGImage').change(this._showNPCColOption.bind(this));
    html.find('#charBGImage').change((ev) => this._showColOption(ev, '#pcColPanel', charBGImage.value));
    html.find('#npcBGImage').change((ev) => this._showColOption(ev, '#npcColPanel', npcBGImage.value));
    html.find('#titleBGImage').change((ev) => this._showColOption(ev, '#titleColPanel', titleBGImage.value));
    html.find('#editableImage').change((ev) => this._showColOption(ev, '#editableColPanel', editableImage.value));
    html.find('#nonEditableImage').change((ev) => this._showColOption(ev, '#noneditableColPanel', nonEditableImage.value));
    html.find('button[name="resetPC"]').click(this.onResetPC.bind(this));
    html.find('button[name="resetNPC"]').click(this.onResetNPC.bind(this));
    html.find('button[name="resetTitle"]').click(this.onResetTitle.bind(this));
    html.find('button[name="resetEditable"]').click(this.onResetEditable.bind(this));
    html.find('button[name="resetNonEditable"]').click(this.onResetNonEditable.bind(this));
    html.find('button[name="resetAll"]').click(this.onResetAll.bind(this));

    document.getElementById('charBGImage').value = game.settings.get('symbaroum', 'charBGChoice');
    document.getElementById('npcBGImage').value = game.settings.get('symbaroum', 'npcBGChoice');
    document.getElementById('titleBGImage').value = game.settings.get('symbaroum', 'titleBGChoice');
    document.getElementById('editableImage').value = game.settings.get('symbaroum', 'editableChoice');
    document.getElementById('nonEditableImage').value = game.settings.get('symbaroum', 'nonEditableChoice');

    if (game.settings.get('symbaroum', 'charBGChoice') === 'none') {
      document.getElementById('pcColPanel').style.display = 'block';
    }
    if (game.settings.get('symbaroum', 'npcBGChoice') === 'none') {
      document.getElementById('npcColPanel').style.display = 'block';
    }
    if (game.settings.get('symbaroum', 'titleBGChoice') === 'none') {
      document.getElementById('titleColPanel').style.display = 'block';
    }
    if (game.settings.get('symbaroum', 'editableChoice') === 'none') {
      document.getElementById('editableColPanel').style.display = 'block';
    }
    if (game.settings.get('symbaroum', 'nonEditableChoice') === 'none') {
      document.getElementById('noneditableColPanel').style.display = 'block';
    }
  }

  onResetPC() {
    game.settings.set('symbaroum', 'charBGChoice', 'url(../asset/image/background/green_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'switchCharBGColour', 'url(../asset/image/background/green_flower_light.webp) repeat');
    location.reload();
  }

  onResetNPC() {
    game.settings.set('symbaroum', 'npcBGChoice', 'url(../asset/image/background/purple_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'switchNpcBGColour', 'url(../asset/image/background/purple_flower_light.webp) repeat');
    location.reload();
  }

  onResetTitle() {
    game.settings.set('symbaroum', 'titleBGChoice', 'url(../asset/image/background/title.webp)');
    game.settings.set('symbaroum', 'switchTitleColour', 'url(../asset/image/background/title.webp)');
    location.reload();
  }

  onResetEditable() {
    game.settings.set('symbaroum', 'editableChoice', 'url(../asset/image/background/editable.webp)');
    game.settings.set('symbaroum', 'switchEditableColour', 'url(../asset/image/background/editable.webp)');
    location.reload();
  }
  onResetNonEditable() {
    game.settings.set('symbaroum', 'nonEditableChoice', 'url(../asset/image/background/not-editable.webp)');
    game.settings.set('symbaroum', 'switchNoNEditableColour', 'url(../asset/image/background/not-editable.webp)');
    location.reload();
  }

  onResetAll() {
    game.settings.set('symbaroum', 'charBGChoice', 'url(../asset/image/background/green_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'switchCharBGColour', 'url(../asset/image/background/green_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'npcBGChoice', 'url(../asset/image/background/purple_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'switchNpcBGColour', 'url(../asset/image/background/purple_flower_light.webp) repeat');
    game.settings.set('symbaroum', 'titleBGChoice', 'url(../asset/image/background/title.webp)');
    game.settings.set('symbaroum', 'switchTitleColour', 'url(../asset/image/background/title.webp)');
    game.settings.set('symbaroum', 'editableChoice', 'url(../asset/image/background/editable.webp)');
    game.settings.set('symbaroum', 'switchEditableColour', 'url(../asset/image/background/editable.webp)');
    game.settings.set('symbaroum', 'nonEditableChoice', 'url(../asset/image/background/not-editable.webp)');
    game.settings.set('symbaroum', 'switchNoNEditableColour', 'url(../asset/image/background/not-editable.webp)');
    location.reload();
  }

  async _updateObject(event, formData) {
    await game.settings.set('symbaroum', 'charBGChoice', formData.charBGImage);
    await game.settings.set('symbaroum', 'npcBGChoice', formData.npcBGImage);
    await game.settings.set('symbaroum', 'titleBGChoice', formData.titleBGImage);
    await game.settings.set('symbaroum', 'editableChoice', formData.editableImage);
    await game.settings.set('symbaroum', 'nonEditableChoice', formData.nonEditableImage);

    if (charBGImage.value === 'none') {
      if (formData.npcBGColour.length > 0 && formData.charBGColour[0] != '#') {
        formData.charBGColour = '#000000';
      }
      await game.settings.set('symbaroum', 'switchCharBGColour', formData.charBGColour);
    } else {
      await game.settings.set('symbaroum', 'switchCharBGColour', formData.charBGImage);
    }

    if (npcBGImage.value === 'none') {
      if (formData.npcBGColour.length > 0 && formData.npcBGColour[0] != '#') {
        formData.npcBGColour = '#000000';
      }
      await game.settings.set('symbaroum', 'switchNpcBGColour', formData.npcBGColour);
    } else {
      await game.settings.set('symbaroum', 'switchNpcBGColour', formData.npcBGImage);
    }
    if (titleBGImage.value === 'none') {
      if (formData.titleBGColour.length > 0 && formData.titleBGColour[0] != '#') {
        formData.titleBGColour = '#000000';
      }
      await game.settings.set('symbaroum', 'switchTitleColour', formData.titleBGColour);
    } else {
      await game.settings.set('symbaroum', 'switchTitleColour', formData.titleBGImage);
    }

    if (editableImage.value === 'none') {
      if (formData.editableColour.length > 0 && formData.editableColour[0] != '#') {
        formData.editableColour = '#000000';
      }
      await game.settings.set('symbaroum', 'switchEditableColour', formData.editableColour);
    } else {
      await game.settings.set('symbaroum', 'switchEditableColour', formData.editableImage);
    }

    if (nonEditableImage.value === 'none') {
      if (formData.noneditableColour.length > 0 && formData.noneditableColour[0] != '#') {
        formData.noneditableColour = '#000000';
      }
      await game.settings.set('symbaroum', 'switchNoNEditableColour', formData.noneditableColour);
    } else {
      await game.settings.set('symbaroum', 'switchNoNEditableColour', formData.nonEditableImage);
    }

    location.reload();
  }

  close() {
    super.close();
  }

  async _showColOption(event, mChild, iValue) {
    // debugger;
    event.preventDefault();
    let li = $(event.currentTarget).parents('.tab-active');
    let li2 = li.children(mChild);
    if (li2[0].style.display === 'none' && iValue === 'none') {
      li2[0].style.display = 'block';
    } else {
      li2[0].style.display = 'none';
    }
  }
}
