---
title: Home
nav_order: 1
---

# Spacefinder

Spacefinder is a map and list of places, built as a Jekyll theme. The University of Leeds uses it for study spaces at [spacefinder.leeds.ac.uk](https://spacefinder.leeds.ac.uk/), and the University of Cambridge at [spacefinder.lib.cam.ac.uk](https://spacefinder.lib.cam.ac.uk/). The application can also be used to display other datasets, such as building locations or public art. To add a dataset, put a folder of data in the site and list it in the configuration.

## In this documentation

- **[Project](project/):** where Spacefinder came from, the University of
  Leeds pilot, its features and the development roadmap.
- **[Data models](data-models/):** how places are described with
  schema.org JSON-LD.
- **[Guides](guides/):** configuring the theme, adding a dataset, and
  working on the code.
- **[API](api/):** the core JavaScript modules, generated from the comments
  in the code.

## What is Spacefinder?

Spacefinder was a Ruby on Rails web application [developed by the University of Cambridge]({{ site.url }}{{ site.baseurl }}{% link project/history.md %}). It used a PostgreSQL database to store details for 213 study spaces in Cambridge which students may wish to use for study or to meet with others. These ranged from Bars and pubs to the University’s own coffee shops and libraries.

<https://spacefinder.lib.cam.ac.uk/>

Spacefinder was made into an [Open Source project by the University of Cambridge on GitHub](https://github.com/cambridge-collection/spacefinder) in early 2022, and the University of Leeds started a port of the application to a jekyll-based static Single Page Application, which was launched in June 2022 with data from the University of Leeds about study spaces on campus.

The application user interface has a list of spaces and shows their location on a map. Users can filter the list of spaces based on noise level, facilities and atmosphere using controlled vocabularies. Spaces are sorted based on their proximity to users (if geolocation of users is possible/permitted). Details for spaces include descriptions, addresses, contact details and opening hours.

## What is this repository?

This repository contains a rewrite of the code in the Cambridge application's UI - the Rails app has been replaced by two JSON data files which load data for all spaces (instead of loading them 35 at a time) and improves filtering and searching by having all the data available and performing all these actions on the client using Javascript. This repository contains the application code and can be used as a jekyll theme.

The project was initiated by the University of Leeds library to explore the possibility of using the Cambridge app in Leeds, but adoption of the full Rails stack was not possible at the time.

Version 0.9 of the application was released in 2023. In 2024/5 planning started on a new version of Spacefinder which is capable of loading additional datasets (in response to a request from the University of Leeds Galleries Team to feature the campus Art Trail). After the [release of Leaflet 2.0 Alpha](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html), a decision was taken to refactor the application using ESM and Leaflet 2.0.
