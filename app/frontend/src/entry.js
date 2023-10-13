import './css/application.scss'
import './css/document-list.scss'
import './css/devolved-nations.scss'
import './css/contents-list.scss'
import './css/print-link.scss'
import './css/govspeak.scss'
import './css/organisation-logo.scss'
import './js/cookies'
import './js/handleDuplicateFormSubmissions'

import $ from 'jquery'
import moj from '@ministryofjustice/frontend'

if (typeof moj.MultiFileUpload !== 'undefined') {
  window.$ = $
  new moj.MultiFileUpload({
    container: $('.moj-multi-file-upload'),
    uploadUrl: '/ajax-upload-url',
    deleteUrl: '/ajax-delete-url'
  })
}
