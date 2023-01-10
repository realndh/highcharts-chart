# ptcs-popup-controller

## Overview

ptcs-popup-controller is a hidden component that opens a popup window with provided URL and waiting for the "result" message from it.


## Usage Examples

### Basic Usage

~~~html
 <ptcs-popup-controller url="<YOUR_URL>"></ptcs-popup-controller>
~~~

## Component API

### Properties
| Property | Type | Description | Triggers a changed event? |
|----------|------|-------------|---------------------------|
|url |String|Url to be opened in the popup|No|
|messageValidation |Boolean|Deprecated. Additional level of security. Response from the URL should be validated using randomly generated string. Default: true.|No|
|disableResultValidation |Boolean|Prevents the popup controller from validating that the popup result has a result and a status field format. Default: false.|No|
|disableMessageValidation |Boolean|Don't validate response from the URL using randomly generated string. Default: false.|No|
|popupWidth |Number|Width of the popup|No|
|popupHeight |Number|Height of the popup|No|
|popupState |String|Readonly. initial/open/canceled/done/blocked|No|
|result |String|Readonly. URL result.|No|
|modal |Boolean|Deprecated. Should popup be modal? Default: true.|No|
|nonModal |Boolean|Should popup be non-modal? Default: false.|No|
|showPopupBlockedMessage |Boolean|Enables you to display an alert message when the popup window is blocked by the browser? Default: false.|No|
|popupBlockedMessage |String|Message to display when the popup window is blocked|No|
|method |String|Request method type for opening pop-up. "GET"/"POST". Default: "GET".|No|
|params |Object|JS object which specifes the parameters that will be sent with the request.|No|

### Events

| Name | Description |
|------|-------------|
|popup-done| Triggered when URL returned a result successfully. You can get the result from ```detail.result``` |
|popup-canceled| Triggered when URL failed or the popup was closed manually. |
|popup-blocked| Triggered when popup is not allowed by the browser. |


### Methods

| Signature | Description |
|-----------|-------------|
| open | Open popup window with the provided url. Returns a promise that is either resolved with the token value or rejected. |
