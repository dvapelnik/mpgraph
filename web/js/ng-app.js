(function (angular, undercore, cy) {
  angular.module('underscore', [])
    .factory('_', function () {
      return undercore;
    });

  angular.module('cytoscape', [])
    .factory('cy', function () {
      return cytoscape
    });

  angular.module('ng-app', ['underscore', 'angular-growl', 'cytoscape'])
    .config(['growlProvider', function (growlProvider) {
      growlProvider.globalReversedOrder(true);
      growlProvider.globalTimeToLive(3000);
    }])
    .controller('MainController', function ($scope, $http, growl, _, cy) {
      $scope.questionList = undefined;
      $scope.currentQuestion = undefined;
      $scope.answers = [];

      $scope.$watch('currentQuestion', function () {
        var cyObject = cy({
          container: document.getElementById('cy-container'),
          style: cy.stylesheet()
            .selector('node')
            .css({
              'content': 'data(id)'
            })
            .selector('edge')
            .css({
              'target-arrow-shape': 'triangle',
              'width': 4,
              'line-color': '#ddd',
              'target-arrow-color': '#ddd'
            })
            .selector('.highlighted')
            .css({
              'background-color': '#61bffc',
              'line-color': '#61bffc',
              'target-arrow-color': '#61bffc',
              'transition-property': 'background-color, line-color, target-arrow-color',
              'transition-duration': '0.5s'
            }),
          layout: {
            name: 'breadthfirst',
            directed: true,
            roots: '#a',
            padding: 10
          },
          elements: {
            nodes: [
              {data: {id: 'a'}},
              {data: {id: 'b'}},
              {data: {id: 'c'}},
              {data: {id: 'd'}},
              {data: {id: 'e'}}
            ],

            edges: [
              {data: {id: 'a"e', weight: 1, source: 'a', target: 'e'}},
              {data: {id: 'ab', weight: 3, source: 'a', target: 'b'}},
              {data: {id: 'be', weight: 4, source: 'b', target: 'e'}},
              {data: {id: 'bc', weight: 5, source: 'b', target: 'c'}},
              {data: {id: 'ce', weight: 6, source: 'c', target: 'e'}},
              {data: {id: 'cd', weight: 2, source: 'c', target: 'd'}},
              {data: {id: 'de', weight: 7, source: 'd', target: 'e'}}
            ]
          }
        });

        var bfs = cyObject.elements().bfs('#a', function () {

        }, true);

        var i = 0;
        var highlightNextEle = function(){
          bfs.path[i].addClass('highlighted');

          if( i < bfs.path.length ){
            i++;
            setTimeout(highlightNextEle, 1000);
          }
        };

// kick off first highlight
        highlightNextEle();
      });

      var results;

      $scope.getResult = function () {
        var lastAnswer = $scope.answers[$scope.answers.length - 1];
        return lastAnswer && lastAnswer.resultId ? _.findWhere(results, {id: lastAnswer.resultId}) : false;
      };

      $scope.restart = function (withMessage) {
        withMessage = withMessage || false;

        $scope.answers = [];
        $scope.currentQuestion = $scope.questionList.getStartQuestion();

        if (withMessage) {
          growl.success('Restarted');
        }
      };

      $scope.doAnswer = function (questionId, answer) {
        $scope.currentQuestion.answer = answer;
        $scope.answers.push(answer);
        $scope.currentQuestion = $scope.currentQuestion.getNextQuestion();
      };

      generateQuestionList();

      function generateQuestionList() {
        $scope.questionList = new QuestionList(data);
        $scope.restart();
        results = data.results;
      }

      function QuestionList(questionsData) {
        this.list = [];

        this.getStartQuestion = function () {
          return this.list[0];
        };

        _.each(questionsData.questions, function (question) {
          var questionObj = new Question(question, this);
          this.list.push(questionObj);
        }, this);
      }

      function Question(questionData, questionList) {
        this.questionList = questionList;

        this.id = questionData.id;
        this.question = questionData.question;
        //this.answers = questionData.answers;
        this.answers = _.map(questionData.answers, function (answerData) {
          return new Answer(answerData, this.questionList);
        }, this);

        this.answer = undefined;

        this.getNextQuestion = function () {
          if (this.answer === undefined) return false;

          return this.answer.getNextQuestion();
        };

        this.hasNextQuestion = function () {
          return this.answer && this.answer.nextQuestionId !== undefined;
        };
      }

      function Answer(answerData, questionList) {
        this.questionList = questionList;

        this.id = answerData.id;
        this.answer = answerData.answer;
        this.nextQuestionId = answerData.nextQuestionId;
        this.resultId = answerData.resultId;
        this.isPositive = answerData.isPositive;

        this.getQuestion = function () {
          var _questionListFiltered = _.filter(this.questionList.list, function (question) {
            return !!_.findWhere(question.answers, {id: this.id})
          }, this);
          return _questionListFiltered ? _questionListFiltered[0] : false;
        };

        this.getNextQuestion = function () {
          return _.findWhere(this.questionList.list, {
            id: this.nextQuestionId
          }, this);
        };
      }
    });
})
(window.angular, window._, window.cy);