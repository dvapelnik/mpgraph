(function (angular, undercore) {
  angular.module('underscore', [])
    .factory('_', function () {
      return undercore;
    });

  angular.module('ng-app', ['underscore', 'angular-growl'])
    .config(['growlProvider', function (growlProvider) {
      growlProvider.globalReversedOrder(true);
      growlProvider.globalTimeToLive(3000);
    }])
    .controller('MainController', function ($scope, $http, growl, _) {
      $scope.questionList = undefined;
      $scope.currentQuestion = undefined;
      $scope.answers = [];

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
})(window.angular, window._);