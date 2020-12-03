module.exports = {
  siteMetadata: {
    title: `WorkClass`,
    description: `Need an employee? WorkClass will help you find one in 24 hours!`,
    author: `@xl-s`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-antd`,
    `gatsby-plugin-typescript`,
    `gatsby-plugin-typescript-checker`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `gatsby-starter-default`,
        short_name: `starter`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/favicon.png`, // This path is relative to the root of the site.
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
  ],
}
