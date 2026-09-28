import '../../styles/browser_style.scss';
import '../../styles/dynamic-styles.scss';
import '../../core/styleManager.js';
import '../../core/broadcastChannels.js';
import '../../core/browser_app.js';
import '../../core/load_settings.js';
// Imported last so its "default to transparent for the preview" line runs
// after load_settings.js's own default-bgColor logic — see the comment
// inside for why the order matters.
import '../../core/localPreviewBackground.js';
