/** No-op render stub — FDM prepare skips when `settings.render === false`. */
export const render = {
  async path() {
    /* intentionally empty for worker prepare/export path */
  },
}
