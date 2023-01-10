# ptcs-pagination

## Overview

Pagination is a web component that enables you to navigate and view large sets of data more easily by splitting results into multiple pages. It lets users measure the overall number of results, relate the current displayed data to other results on different pages, and find relevant data more effectively. The pagination appearance changes and depends on the container size.

When working with the component, you should be aware of the following considerations:
  
* You must set the pageSize property to one of values defined by pageBreaks, e.g. if pageBreaks is ['10', '25', '50'], then pageSize can take either '10' or '25' or '50'
* The total number of pages is calculated based on pageSize and totalNumberOfElements, e.g. for 10 and 1000 (respectively), the maximum page number is 100
* You can set the pageSize and totalNumberOfElements properties within the HTML markup or using JavaScript.
* The pageNumber property has a two-way binding that you can use to set the current page.

See the following examples for more information.

## Sub-components

-[ptcs-pagination-carousel](components/ptcs-pagination-carousel/README.md)

-[ptcs-pagination-input-number](components/ptcs-input-number/README.md)

## Usage Examples

### Basic Usage

~~~html
<ptcs-pagination total-number-of-elements="50" page-size="10"></ptcs-pagination>
~~~

~~~js
const ptcsPagination = document.querySelector('ptcs-pagination');
ptcsPagination.addEventListener('page-number-changed', event => {
    const selectedPageNo = event.detail.value;
    console.log('Selected page no:', selectedPageNo);
});
...
ptcsPagination.totalNumberOfElements = 189;
...
ptcsPagination.pageSize = 2;
...
const pageBreaks = {
    firstBreak:  10,
    secondBreak: 25,
    thirdBreak:  50,
    fourthBreak: 75,
    fifthBreak:  100
};
ptcsPagination = Object.assign(ptcsPagination, pageBreaks)
...
~~~

## Component API

### Properties

| Property                 | Type    | Description | Triggers a changed event |
|------------------------- |---------|-------------|--------------------------|
| pageNumber               | Number  | Selected page | Yes |
| pageSize                 | Number  | The current page size, 10 by default | No |
| maximumWidth             | Number  | Enables you to specify a value to restrict the maximum width | No |
| totalNumberOfElements    | Number  | The total number of elements is calculated from totalNumberOfPages divided by pageSize | No |
| firstBreak               | Number  | The value for the first option that determines the number of results to display on a page. | No |
| secondBreak              | Number  | The value for the second option that determines the number of results to display on a page. | No |
| thirdBreak               | Number  | The value for the third option that determines the number of results to display on a page. | No |
| fourthBreak              | Number  | The value for the fourth option that determines the number of results to display on a page. | No |
| fifthBreak               | Number  | The value for the fifth option that determines the number of results to display on a page. | No |
| showPageBreak            | Boolean | Adds a drop-down list that enables users to select the number of results to show on each page. | No |
| showTotalResults         | Boolean | Enables you to display the total number of results that are returned from the server. | No |
| showDirectLink           | Boolean | Adds an input field that enables users to navigate to a specific page number. | No |

### Events

The `page-number-changed` event is triggered when the pageNumber property changes. See the example above for more information.

### Methods

No methods.

## Styling

### Parts

| Part | Description |
|-----------|-------------|
| page-break-and-total-results-container | The container for the following parts: "string-show-label", "page-results-dropdown", "string-of-label", "total", and "total-results-label" |
| total | The container for the numeric value of the total results |
| total-results-label | The container for the localized "results" string |
| page-results-dropdown | A dropdown with options for the number of results on the page |
| string-per-page-label | The container for the localized "per page" string |
| carousel | The component representing possible navigation buttons. **ptcs-pagination-carousel** |
| direct-link | The container for the label and input-number element |
| string-jump-to-label | The label that is shown before the "input-number" element |
| input-number | The component that allows only to type the positive, natural numbers. **ptcs-pagination-input-number** |

The order of the children of `page-break-and-total-results-container` varies according to the language.
