function i18n(lang) {
	return new Promise((resolve, reject) => {
		fetch(`../../${lang}.json`)
			.then(response => response.json())
			.then(json => {
				const langPackage = json.Localization;
				resolve(text => {
					return langPackage[text] ?? text;
				});
			})
			.catch(reason => {
				reject(reason);
			});
	});
}
