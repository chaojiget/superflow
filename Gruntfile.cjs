/* eslint-env node */
module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // 基本的构建任务配置
    copy: {
      main: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: '**',
            dest: 'dist/',
          },
        ],
      },
    },
  });

  // 加载任务插件
  grunt.loadNpmTasks('grunt-contrib-copy');

  // 注册默认任务
  grunt.registerTask('default', ['copy']);

  // 注册构建任务
  grunt.registerTask('build', ['copy']);
};
